import pytest
import tempfile
import shutil
import os
from unittest.mock import Mock, MagicMock
from typing import List, Dict, Any

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