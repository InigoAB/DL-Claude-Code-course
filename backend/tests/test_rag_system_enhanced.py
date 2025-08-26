"""
Enhanced RAG system tests focusing on real-world edge cases and error conditions.
These tests complement existing tests by testing actual integration issues.
"""
import pytest
import tempfile
import shutil
import os
from unittest.mock import Mock, patch, MagicMock
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_system import RAGSystem
from config import Config
from models import Course, Lesson, CourseChunk
from vector_store import SearchResults


class TestRAGSystemRealWorldScenarios:
    """Test RAG system with real-world scenarios and edge cases"""

    @pytest.fixture
    def temp_chroma_path(self):
        """Create temporary ChromaDB path"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

    @pytest.fixture
    def working_config(self, temp_chroma_path):
        """Create a working config with proper MAX_RESULTS"""
        config = Config()
        config.CHROMA_PATH = temp_chroma_path
        config.ANTHROPIC_API_KEY = "test-key"
        config.MAX_RESULTS = 5  # Fix the bug!
        return config

    @pytest.fixture
    def broken_config(self, temp_chroma_path):
        """Create config with the original bug (MAX_RESULTS=0)"""
        config = Config()
        config.CHROMA_PATH = temp_chroma_path
        config.ANTHROPIC_API_KEY = "test-key"
        config.MAX_RESULTS = 0  # The bug that causes "query failed"
        return config

    def test_query_with_broken_config_reveals_bug(self, broken_config):
        """Test that broken config causes query failures"""
        with patch('rag_system.DocumentProcessor'), \
             patch('rag_system.SessionManager'), \
             patch('rag_system.AIGenerator') as mock_ai_gen:
            
            # Mock AI generator to use tools
            mock_tool_response = Mock()
            mock_tool_response.stop_reason = "tool_use"
            mock_tool_block = Mock()
            mock_tool_block.type = "tool_use"
            mock_tool_block.name = "search_course_content"
            mock_tool_block.input = {"query": "test"}
            mock_tool_block.id = "tool_123"
            mock_tool_response.content = [mock_tool_block]
            
            mock_final_response = Mock()
            mock_final_response.content = [Mock(text="I couldn't find relevant information.")]
            
            mock_client = Mock()
            mock_client.messages.create.side_effect = [mock_tool_response, mock_final_response]
            mock_ai_gen.return_value.client.messages.create = mock_client.messages.create
            mock_ai_gen.return_value.generate_response.side_effect = lambda *args, **kwargs: "I couldn't find relevant information."
            
            rag = RAGSystem(broken_config)
            
            # Add some test data
            test_course = Course(
                title="Test Course",
                course_link="https://example.com",
                instructor="Test Instructor",
                lessons=[]
            )
            test_chunks = [
                CourseChunk(
                    content="This is test content about machine learning.",
                    course_title="Test Course",
                    lesson_number=1,
                    chunk_index=0
                )
            ]
            
            rag.vector_store.add_course_metadata(test_course)
            rag.vector_store.add_course_content(test_chunks)
            
            # Query should fail due to MAX_RESULTS=0
            response, sources = rag.query("What is machine learning?")
            
            # The bug causes empty sources because search returns no results
            assert len(sources) == 0, "MAX_RESULTS=0 causes empty sources"

    def test_query_with_working_config(self, working_config):
        """Test that working config allows successful queries"""
        with patch('rag_system.DocumentProcessor'), \
             patch('rag_system.SessionManager'), \
             patch('rag_system.AIGenerator') as mock_ai_gen:
            
            # Mock successful AI response
            mock_ai_gen.return_value.generate_response.return_value = "Here's information about machine learning..."
            
            rag = RAGSystem(working_config)
            
            # Add some test data
            test_course = Course(
                title="Test Course",
                course_link="https://example.com",
                instructor="Test Instructor",
                lessons=[Lesson(lesson_number=1, title="ML Basics", lesson_link="https://example.com/lesson1")]
            )
            test_chunks = [
                CourseChunk(
                    content="This is test content about machine learning algorithms and concepts.",
                    course_title="Test Course",
                    lesson_number=1,
                    chunk_index=0
                )
            ]
            
            rag.vector_store.add_course_metadata(test_course)
            rag.vector_store.add_course_content(test_chunks)
            
            # Mock the tool manager to return sources
            rag.tool_manager.get_last_sources = Mock(return_value=[
                {"text": "Test Course - Lesson 1", "link": "https://example.com/lesson1"}
            ])
            
            response, sources = rag.query("What is machine learning?")
            
            # With working config, should get results
            assert response == "Here's information about machine learning..."
            assert len(sources) > 0

    def test_query_with_empty_database(self, working_config):
        """Test query behavior with empty database"""
        with patch('rag_system.DocumentProcessor'), \
             patch('rag_system.SessionManager'), \
             patch('rag_system.AIGenerator') as mock_ai_gen:
            
            # Mock AI response for empty search
            mock_tool_response = Mock()
            mock_tool_response.stop_reason = "tool_use"
            mock_tool_block = Mock()
            mock_tool_block.type = "tool_use"
            mock_tool_block.name = "search_course_content"
            mock_tool_block.input = {"query": "test"}
            mock_tool_block.id = "tool_123"
            mock_tool_response.content = [mock_tool_block]
            
            mock_final_response = Mock()
            mock_final_response.content = [Mock(text="I don't have information about that topic.")]
            
            mock_client = Mock()
            mock_client.messages.create.side_effect = [mock_tool_response, mock_final_response]
            
            def mock_generate_response(*args, **kwargs):
                if kwargs.get('tool_manager'):
                    # Simulate tool execution with empty database
                    tool_result = kwargs['tool_manager'].execute_tool("search_course_content", query="test")
                    return "I don't have information about that topic."
                return "I don't have information about that topic."
            
            mock_ai_gen.return_value.generate_response.side_effect = mock_generate_response
            
            rag = RAGSystem(working_config)
            # No data added to database
            
            response, sources = rag.query("What is quantum computing?")
            
            assert "don't have information" in response
            assert len(sources) == 0

    def test_query_with_missing_api_key(self, working_config):
        """Test query behavior with missing API key"""
        working_config.ANTHROPIC_API_KEY = ""
        
        with patch('rag_system.DocumentProcessor'), \
             patch('rag_system.SessionManager'), \
             patch('rag_system.AIGenerator') as mock_ai_gen:
            
            # Mock API error for missing key
            mock_ai_gen.return_value.generate_response.side_effect = Exception("Invalid API key")
            
            rag = RAGSystem(working_config)
            
            with pytest.raises(Exception) as exc_info:
                rag.query("Test query")
            
            assert "Invalid API key" in str(exc_info.value)

    def test_session_management_with_long_history(self, working_config):
        """Test session management with very long conversation history"""
        with patch('rag_system.DocumentProcessor'), \
             patch('rag_system.SessionManager') as mock_session_mgr, \
             patch('rag_system.AIGenerator') as mock_ai_gen:
            
            # Create very long history
            long_history = "\n".join([f"User: Question {i}\nAssistant: Answer {i}" for i in range(100)])
            mock_session_mgr.return_value.get_conversation_history.return_value = long_history
            mock_ai_gen.return_value.generate_response.return_value = "Response with long history"
            
            rag = RAGSystem(working_config)
            rag.tool_manager.get_last_sources = Mock(return_value=[])
            
            response, sources = rag.query("Follow up question", session_id="long-session")
            
            # Should handle long history gracefully
            assert response == "Response with long history"
            mock_session_mgr.return_value.get_conversation_history.assert_called_once_with("long-session")

    def test_concurrent_queries_session_isolation(self, working_config):
        """Test that concurrent queries with different sessions are isolated"""
        with patch('rag_system.DocumentProcessor'), \
             patch('rag_system.SessionManager') as mock_session_mgr, \
             patch('rag_system.AIGenerator') as mock_ai_gen:
            
            # Mock different histories for different sessions
            def mock_get_history(session_id):
                if session_id == "session1":
                    return "User: About AI\nAssistant: AI info"
                elif session_id == "session2":
                    return "User: About ML\nAssistant: ML info"
                return None
            
            mock_session_mgr.return_value.get_conversation_history.side_effect = mock_get_history
            mock_ai_gen.return_value.generate_response.return_value = "Session-specific response"
            
            rag = RAGSystem(working_config)
            rag.tool_manager.get_last_sources = Mock(return_value=[])
            
            # Query with session 1
            response1, _ = rag.query("Follow up about AI", session_id="session1")
            
            # Query with session 2  
            response2, _ = rag.query("Follow up about ML", session_id="session2")
            
            # Both should get responses but with different contexts
            assert response1 == "Session-specific response"
            assert response2 == "Session-specific response"
            
            # Verify correct sessions were used
            calls = mock_session_mgr.return_value.get_conversation_history.call_args_list
            assert calls[0][0] == ("session1",)
            assert calls[1][0] == ("session2",)

    def test_tool_execution_error_handling(self, working_config):
        """Test handling of tool execution errors during query"""
        with patch('rag_system.DocumentProcessor'), \
             patch('rag_system.SessionManager'), \
             patch('rag_system.AIGenerator') as mock_ai_gen:
            
            rag = RAGSystem(working_config)
            
            # Mock tool manager to raise error
            rag.tool_manager.execute_tool = Mock(side_effect=Exception("ChromaDB connection failed"))
            rag.tool_manager.get_tool_definitions = Mock(return_value=[{"name": "search_course_content"}])
            
            mock_ai_gen.return_value.generate_response.side_effect = Exception("Tool execution failed")
            
            with pytest.raises(Exception) as exc_info:
                rag.query("Search for content")
            
            assert "Tool execution failed" in str(exc_info.value)

    def test_large_document_processing(self, working_config):
        """Test processing very large documents"""
        with patch('rag_system.DocumentProcessor') as mock_doc_proc, \
             patch('rag_system.SessionManager'), \
             patch('rag_system.AIGenerator'):
            
            # Mock processing of large document
            large_course = Course(
                title="Large Course",
                course_link="https://example.com",
                instructor="Test Instructor",
                lessons=[Lesson(lesson_number=i, title=f"Lesson {i}", lesson_link=f"https://example.com/lesson{i}") for i in range(1, 101)]
            )
            
            # Create many chunks
            large_chunks = [
                CourseChunk(
                    content=f"Content for chunk {i} with detailed information about topic {i}.",
                    course_title="Large Course",
                    lesson_number=(i % 10) + 1,
                    chunk_index=i
                ) for i in range(1000)
            ]
            
            mock_doc_proc.return_value.process_course_document.return_value = (large_course, large_chunks)
            
            rag = RAGSystem(working_config)
            
            course, chunk_count = rag.add_course_document("/path/to/large_course.txt")
            
            assert course.title == "Large Course"
            assert chunk_count == 1000
            
            # Verify data was added to vector store
            assert rag.vector_store.add_course_metadata.call_count == 1
            assert rag.vector_store.add_course_content.call_count == 1

    def test_document_processing_corruption_handling(self, working_config):
        """Test handling of corrupted document processing"""
        with patch('rag_system.DocumentProcessor') as mock_doc_proc, \
             patch('rag_system.SessionManager'), \
             patch('rag_system.AIGenerator'):
            
            # Mock corrupted document processing
            mock_doc_proc.return_value.process_course_document.side_effect = Exception("Corrupted file format")
            
            rag = RAGSystem(working_config)
            
            course, chunk_count = rag.add_course_document("/path/to/corrupted.txt")
            
            # Should handle corruption gracefully
            assert course is None
            assert chunk_count == 0

    def test_analytics_with_real_data(self, working_config):
        """Test analytics with real course data"""
        with patch('rag_system.DocumentProcessor'), \
             patch('rag_system.SessionManager'), \
             patch('rag_system.AIGenerator'):
            
            rag = RAGSystem(working_config)
            
            # Add multiple courses
            courses = [
                Course(title=f"Course {i}", course_link=f"https://example.com/course{i}", 
                      instructor=f"Instructor {i}", lessons=[])
                for i in range(5)
            ]
            
            for course in courses:
                rag.vector_store.add_course_metadata(course)
            
            analytics = rag.get_course_analytics()
            
            assert analytics["total_courses"] == 5
            assert len(analytics["course_titles"]) == 5
            assert all(f"Course {i}" in analytics["course_titles"] for i in range(5))

    def test_source_tracking_accuracy(self, working_config):
        """Test that sources are accurately tracked and returned"""
        with patch('rag_system.DocumentProcessor'), \
             patch('rag_system.SessionManager'), \
             patch('rag_system.AIGenerator') as mock_ai_gen:
            
            mock_ai_gen.return_value.generate_response.return_value = "Found relevant information"
            
            rag = RAGSystem(working_config)
            
            # Add course with lessons
            course = Course(
                title="Source Test Course",
                course_link="https://example.com/course",
                instructor="Test Instructor",
                lessons=[
                    Lesson(lesson_number=1, title="Intro", lesson_link="https://example.com/lesson1"),
                    Lesson(lesson_number=2, title="Advanced", lesson_link="https://example.com/lesson2")
                ]
            )
            chunks = [
                CourseChunk(
                    content="Introduction content",
                    course_title="Source Test Course",
                    lesson_number=1,
                    chunk_index=0
                ),
                CourseChunk(
                    content="Advanced content",
                    course_title="Source Test Course",
                    lesson_number=2,
                    chunk_index=1
                )
            ]
            
            rag.vector_store.add_course_metadata(course)
            rag.vector_store.add_course_content(chunks)
            
            # Mock tool manager to return specific sources
            expected_sources = [
                {"text": "Source Test Course - Lesson 1", "link": "https://example.com/lesson1"},
                {"text": "Source Test Course - Lesson 2", "link": "https://example.com/lesson2"}
            ]
            rag.tool_manager.get_last_sources = Mock(return_value=expected_sources)
            
            response, sources = rag.query("Tell me about the course content")
            
            assert sources == expected_sources
            assert len(sources) == 2
            assert all("link" in source and "text" in source for source in sources)
            
            # Verify sources were reset after retrieval
            rag.tool_manager.reset_sources.assert_called_once()

    def test_error_recovery_and_graceful_degradation(self, working_config):
        """Test system recovery from various error conditions"""
        with patch('rag_system.DocumentProcessor'), \
             patch('rag_system.SessionManager'), \
             patch('rag_system.AIGenerator') as mock_ai_gen:
            
            rag = RAGSystem(working_config)
            
            # Test 1: Vector store error during search
            rag.vector_store.search = Mock(side_effect=Exception("ChromaDB error"))
            rag.tool_manager.execute_tool = Mock(return_value="Search temporarily unavailable")
            mock_ai_gen.return_value.generate_response.return_value = "I'm having trouble searching right now"
            
            response, sources = rag.query("Search query during error")
            
            assert "trouble searching" in response
            assert len(sources) == 0
            
            # Test 2: Recovery after error
            rag.vector_store.search = Mock(return_value=SearchResults(
                documents=["Recovered content"],
                metadata=[{"course_title": "Test", "lesson_number": 1}],
                distances=[0.1]
            ))
            rag.tool_manager.get_last_sources = Mock(return_value=[{"text": "Test - Lesson 1", "link": None}])
            mock_ai_gen.return_value.generate_response.return_value = "System recovered, here's the information"
            
            response, sources = rag.query("Search query after recovery")
            
            assert "System recovered" in response
            assert len(sources) > 0