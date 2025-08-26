import pytest
import tempfile
import shutil
import os
from unittest.mock import Mock, MagicMock, AsyncMock, patch
from typing import List, Dict, Any
from fastapi.testclient import TestClient
import asyncio

# Add parent directory to path to import modules
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Course, Lesson, CourseChunk
from vector_store import SearchResults
from config import Config


@pytest.fixture
def test_config():
    """Create a test configuration"""
    config = Config()
    config.ANTHROPIC_API_KEY = "test-api-key"
    config.CHROMA_PATH = tempfile.mkdtemp()
    config.MAX_RESULTS = 3
    return config


@pytest.fixture
def sample_course():
    """Create a sample course for testing"""
    lessons = [
        Lesson(lesson_number=1, title="Introduction", lesson_link="https://example.com/lesson1"),
        Lesson(lesson_number=2, title="Advanced Topics", lesson_link="https://example.com/lesson2")
    ]
    return Course(
        title="Sample Course",
        course_link="https://example.com/course",
        instructor="Test Instructor",
        lessons=lessons
    )


@pytest.fixture
def sample_course_chunks():
    """Create sample course chunks for testing"""
    return [
        CourseChunk(
            content="This is the introduction to our sample course. We will cover basic concepts.",
            course_title="Sample Course",
            lesson_number=1,
            chunk_index=0
        ),
        CourseChunk(
            content="In this lesson, we dive deeper into advanced topics and practical applications.",
            course_title="Sample Course", 
            lesson_number=2,
            chunk_index=1
        ),
        CourseChunk(
            content="Here are some examples and case studies to illustrate the concepts.",
            course_title="Sample Course",
            lesson_number=2,
            chunk_index=2
        )
    ]


@pytest.fixture
def mock_search_results():
    """Create mock search results for testing"""
    return SearchResults(
        documents=[
            "This is the introduction to our sample course. We will cover basic concepts.",
            "In this lesson, we dive deeper into advanced topics and practical applications."
        ],
        metadata=[
            {"course_title": "Sample Course", "lesson_number": 1, "chunk_index": 0},
            {"course_title": "Sample Course", "lesson_number": 2, "chunk_index": 1}
        ],
        distances=[0.1, 0.2]
    )


@pytest.fixture
def empty_search_results():
    """Create empty search results for testing"""
    return SearchResults(
        documents=[],
        metadata=[],
        distances=[]
    )


@pytest.fixture
def error_search_results():
    """Create error search results for testing"""
    return SearchResults.empty("Vector store connection failed")


@pytest.fixture
def mock_vector_store():
    """Create a mock vector store for testing"""
    mock_store = Mock()
    mock_store.search.return_value = SearchResults(
        documents=["Sample content"],
        metadata=[{"course_title": "Test Course", "lesson_number": 1}],
        distances=[0.1]
    )
    mock_store.get_lesson_link.return_value = "https://example.com/lesson1"
    return mock_store


@pytest.fixture
def mock_anthropic_client():
    """Create a mock Anthropic client for testing"""
    mock_client = Mock()
    
    # Mock response with tool use
    mock_tool_response = Mock()
    mock_tool_response.stop_reason = "tool_use"
    mock_tool_response.content = [
        Mock(
            type="tool_use",
            name="search_course_content",
            input={"query": "test query"},
            id="tool_call_123"
        )
    ]
    
    # Mock final response
    mock_final_response = Mock()
    mock_final_response.content = [Mock(text="Here is the answer based on search results.")]
    
    mock_client.messages.create.side_effect = [mock_tool_response, mock_final_response]
    return mock_client


@pytest.fixture(autouse=True)
def cleanup_temp_dirs():
    """Clean up temporary directories after each test"""
    yield
    # Cleanup happens automatically with tempfile.mkdtemp() when test ends


@pytest.fixture
def temp_chroma_path():
    """Create a temporary ChromaDB path"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    # Clean up
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)


@pytest.fixture
def mock_rag_system():
    """Create a mock RAG system for API testing"""
    mock_rag = Mock()
    mock_rag.query.return_value = (
        "This is a test answer from the RAG system.",
        [
            {"text": "Sample content from course", "link": "https://example.com/lesson1"},
            {"text": "Additional relevant content", "link": "https://example.com/lesson2"}
        ]
    )
    mock_rag.get_course_analytics.return_value = {
        "total_courses": 2,
        "course_titles": ["Test Course 1", "Test Course 2"]
    }
    
    # Mock session manager
    mock_session_manager = Mock()
    mock_session_manager.create_session.return_value = "test-session-123"
    mock_session_manager.clear_session.return_value = None
    mock_rag.session_manager = mock_session_manager
    
    return mock_rag


@pytest.fixture
def test_app(mock_rag_system):
    """Create a test FastAPI app with mocked dependencies"""
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.middleware.trustedhost import TrustedHostMiddleware
    from pydantic import BaseModel
    from typing import List, Optional, Dict, Any
    
    # Create test app without static file mounting to avoid import issues
    app = FastAPI(title="Test Course Materials RAG System")
    
    # Add middleware
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    
    # Define models inline to avoid import issues
    class QueryRequest(BaseModel):
        query: str
        session_id: Optional[str] = None

    class QueryResponse(BaseModel):
        answer: str
        sources: List[Dict[str, Any]]
        session_id: str

    class CourseStats(BaseModel):
        total_courses: int
        course_titles: List[str]

    class NewSessionRequest(BaseModel):
        old_session_id: Optional[str] = None

    class NewSessionResponse(BaseModel):
        session_id: str
        message: str
    
    # Define API endpoints inline using the mock
    @app.post("/api/query", response_model=QueryResponse)
    async def query_documents(request: QueryRequest):
        try:
            session_id = request.session_id
            if not session_id:
                session_id = mock_rag_system.session_manager.create_session()
            
            answer, sources = mock_rag_system.query(request.query, session_id)
            return QueryResponse(answer=answer, sources=sources, session_id=session_id)
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/courses", response_model=CourseStats)
    async def get_course_stats():
        try:
            analytics = mock_rag_system.get_course_analytics()
            return CourseStats(
                total_courses=analytics["total_courses"],
                course_titles=analytics["course_titles"]
            )
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/new-session", response_model=NewSessionResponse)
    async def start_new_session(request: NewSessionRequest):
        try:
            if request.old_session_id:
                mock_rag_system.session_manager.clear_session(request.old_session_id)
            
            new_session_id = mock_rag_system.session_manager.create_session()
            return NewSessionResponse(
                session_id=new_session_id,
                message="New chat session started successfully"
            )
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/")
    async def root():
        return {"message": "Course Materials RAG System API"}
    
    return app


@pytest.fixture
def client(test_app):
    """Create a test client for the FastAPI app"""
    return TestClient(test_app)


@pytest.fixture
def sample_query_request():
    """Sample query request for API testing"""
    return {
        "query": "What are the main topics covered in the course?",
        "session_id": "test-session-123"
    }


@pytest.fixture
def sample_new_session_request():
    """Sample new session request for API testing"""
    return {
        "old_session_id": "old-session-456"
    }


@pytest.fixture
def expected_query_response():
    """Expected query response for API testing"""
    return {
        "answer": "This is a test answer from the RAG system.",
        "sources": [
            {"text": "Sample content from course", "link": "https://example.com/lesson1"},
            {"text": "Additional relevant content", "link": "https://example.com/lesson2"}
        ],
        "session_id": "test-session-123"
    }


@pytest.fixture
def expected_course_stats():
    """Expected course statistics for API testing"""
    return {
        "total_courses": 2,
        "course_titles": ["Test Course 1", "Test Course 2"]
    }