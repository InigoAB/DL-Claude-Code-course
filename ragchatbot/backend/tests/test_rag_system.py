import os
import sys
import tempfile
from unittest.mock import MagicMock, Mock, patch

import pytest

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from models import Course, CourseChunk, Lesson
from rag_system import RAGSystem


class TestRAGSystem:
    """Integration test suite for RAG system"""

    @pytest.fixture
    def test_config(self):
        """Create test configuration"""
        config = Config()
        config.ANTHROPIC_API_KEY = "test-api-key"
        config.CHROMA_PATH = tempfile.mkdtemp()
        config.MAX_RESULTS = 3
        return config

    @pytest.fixture
    def mock_components(self):
        """Mock all major components for isolated testing"""
        with patch("rag_system.DocumentProcessor") as mock_doc_proc, patch(
            "rag_system.VectorStore"
        ) as mock_vector_store, patch("rag_system.AIGenerator") as mock_ai_gen, patch(
            "rag_system.SessionManager"
        ) as mock_session_mgr:

            # Configure mocks
            mock_doc_proc.return_value = Mock()
            mock_vector_store.return_value = Mock()
            mock_ai_gen.return_value = Mock()
            mock_session_mgr.return_value = Mock()

            yield {
                "doc_processor": mock_doc_proc.return_value,
                "vector_store": mock_vector_store.return_value,
                "ai_generator": mock_ai_gen.return_value,
                "session_manager": mock_session_mgr.return_value,
            }

    def test_init_creates_all_components(self, test_config):
        """Test RAGSystem initialization creates all required components"""
        with patch("rag_system.DocumentProcessor"), patch(
            "rag_system.VectorStore"
        ), patch("rag_system.AIGenerator"), patch("rag_system.SessionManager"):

            rag = RAGSystem(test_config)

            # Verify all components are initialized
            assert rag.document_processor is not None
            assert rag.vector_store is not None
            assert rag.ai_generator is not None
            assert rag.session_manager is not None
            assert rag.tool_manager is not None
            assert rag.search_tool is not None
            assert rag.outline_tool is not None

    def test_init_registers_tools(self, test_config, mock_components):
        """Test that tools are properly registered during initialization"""
        rag = RAGSystem(test_config)

        # Verify tools are registered
        assert "search_course_content" in rag.tool_manager.tools
        assert "get_course_outline" in rag.tool_manager.tools

    def test_query_successful_without_session(self, test_config, mock_components):
        """Test successful query processing without session"""
        mock_components["ai_generator"].generate_response.return_value = (
            "Generated response"
        )
        mock_components["vector_store"].search.return_value = Mock()

        rag = RAGSystem(test_config)
        rag.tool_manager.get_last_sources = Mock(return_value=[])

        response, sources = rag.query("What is AI?")

        assert response == "Generated response"
        assert sources == []

        # Verify AI generator was called with correct parameters
        mock_components["ai_generator"].generate_response.assert_called_once()
        call_args = mock_components["ai_generator"].generate_response.call_args
        assert "What is AI?" in call_args[1]["query"]
        assert call_args[1]["tools"] is not None
        assert call_args[1]["tool_manager"] is not None

    def test_query_successful_with_session(self, test_config, mock_components):
        """Test successful query processing with session"""
        mock_components["ai_generator"].generate_response.return_value = (
            "Response with context"
        )
        mock_components["session_manager"].get_conversation_history.return_value = (
            "Previous conversation"
        )

        rag = RAGSystem(test_config)
        rag.tool_manager.get_last_sources = Mock(return_value=[])

        response, sources = rag.query("Follow up question", session_id="test-session")

        assert response == "Response with context"

        # Verify session manager was used
        mock_components[
            "session_manager"
        ].get_conversation_history.assert_called_once_with("test-session")
        mock_components["session_manager"].add_exchange.assert_called_once()

    def test_query_with_sources(self, test_config, mock_components):
        """Test query processing that returns sources"""
        mock_components["ai_generator"].generate_response.return_value = (
            "Answer with sources"
        )
        mock_sources = [
            {"text": "Course 1 - Lesson 1", "link": "https://example.com/lesson1"},
            {"text": "Course 2 - Lesson 2", "link": None},
        ]

        rag = RAGSystem(test_config)
        rag.tool_manager.get_last_sources = Mock(return_value=mock_sources)
        rag.tool_manager.reset_sources = Mock()

        response, sources = rag.query("Search for content")

        assert response == "Answer with sources"
        assert sources == mock_sources

        # Verify sources were retrieved and reset
        rag.tool_manager.get_last_sources.assert_called_once()
        rag.tool_manager.reset_sources.assert_called_once()

    def test_query_ai_generator_error(self, test_config, mock_components):
        """Test query handling when AI generator raises error"""
        mock_components["ai_generator"].generate_response.side_effect = Exception(
            "API Error"
        )

        rag = RAGSystem(test_config)

        with pytest.raises(Exception) as exc_info:
            rag.query("Test query")

        assert "API Error" in str(exc_info.value)

    def test_add_course_document_successful(
        self, test_config, mock_components, sample_course, sample_course_chunks
    ):
        """Test successful course document addition"""
        mock_components["doc_processor"].process_course_document.return_value = (
            sample_course,
            sample_course_chunks,
        )

        rag = RAGSystem(test_config)

        course, chunk_count = rag.add_course_document("/path/to/course.txt")

        assert course == sample_course
        assert chunk_count == len(sample_course_chunks)

        # Verify processing and storage
        mock_components[
            "doc_processor"
        ].process_course_document.assert_called_once_with("/path/to/course.txt")
        mock_components["vector_store"].add_course_metadata.assert_called_once_with(
            sample_course
        )
        mock_components["vector_store"].add_course_content.assert_called_once_with(
            sample_course_chunks
        )

    def test_add_course_document_processing_error(self, test_config, mock_components):
        """Test course document addition when processing fails"""
        mock_components["doc_processor"].process_course_document.side_effect = (
            Exception("Processing failed")
        )

        rag = RAGSystem(test_config)

        course, chunk_count = rag.add_course_document("/path/to/invalid.txt")

        assert course is None
        assert chunk_count == 0

    @patch("rag_system.os.path.exists")
    @patch("rag_system.os.listdir")
    def test_add_course_folder_successful(
        self,
        mock_listdir,
        mock_exists,
        test_config,
        mock_components,
        sample_course,
        sample_course_chunks,
    ):
        """Test successful course folder processing"""
        mock_exists.return_value = True
        mock_listdir.return_value = [
            "course1.txt",
            "course2.pdf",
            "course3.docx",
            "readme.md",
        ]

        # Mock existing course titles (empty initially)
        mock_components["vector_store"].get_existing_course_titles.return_value = []

        # Mock document processing
        mock_components["doc_processor"].process_course_document.return_value = (
            sample_course,
            sample_course_chunks,
        )

        rag = RAGSystem(test_config)

        courses, chunks = rag.add_course_folder("/path/to/docs", clear_existing=False)

        assert courses == 3  # 3 valid course files
        assert chunks == len(sample_course_chunks) * 3

        # Verify only valid file types were processed
        assert mock_components["doc_processor"].process_course_document.call_count == 3

    @patch("rag_system.os.path.exists")
    def test_add_course_folder_nonexistent(
        self, mock_exists, test_config, mock_components
    ):
        """Test course folder processing when folder doesn't exist"""
        mock_exists.return_value = False

        rag = RAGSystem(test_config)

        courses, chunks = rag.add_course_folder("/nonexistent/path")

        assert courses == 0
        assert chunks == 0

    @patch("rag_system.os.path.exists")
    @patch("rag_system.os.listdir")
    def test_add_course_folder_with_existing_courses(
        self,
        mock_listdir,
        mock_exists,
        test_config,
        mock_components,
        sample_course,
        sample_course_chunks,
    ):
        """Test folder processing with some existing courses"""
        mock_exists.return_value = True
        mock_listdir.return_value = ["course1.txt", "course2.txt"]

        # Mock one existing course
        mock_components["vector_store"].get_existing_course_titles.return_value = [
            "Sample Course"
        ]
        mock_components["doc_processor"].process_course_document.return_value = (
            sample_course,
            sample_course_chunks,
        )

        rag = RAGSystem(test_config)

        courses, chunks = rag.add_course_folder("/path/to/docs")

        # Should skip the existing course, only add one new one
        assert courses == 1
        assert chunks == len(sample_course_chunks)

    @patch("rag_system.os.path.exists")
    @patch("rag_system.os.listdir")
    def test_add_course_folder_clear_existing(
        self,
        mock_listdir,
        mock_exists,
        test_config,
        mock_components,
        sample_course,
        sample_course_chunks,
    ):
        """Test folder processing with clear_existing=True"""
        mock_exists.return_value = True
        mock_listdir.return_value = ["course1.txt"]

        mock_components["vector_store"].get_existing_course_titles.return_value = []
        mock_components["doc_processor"].process_course_document.return_value = (
            sample_course,
            sample_course_chunks,
        )

        rag = RAGSystem(test_config)

        courses, chunks = rag.add_course_folder("/path/to/docs", clear_existing=True)

        # Verify data was cleared
        mock_components["vector_store"].clear_all_data.assert_called_once()

    def test_get_course_analytics(self, test_config, mock_components):
        """Test course analytics retrieval"""
        mock_components["vector_store"].get_course_count.return_value = 5
        mock_components["vector_store"].get_existing_course_titles.return_value = [
            "Course 1",
            "Course 2",
            "Course 3",
        ]

        rag = RAGSystem(test_config)

        analytics = rag.get_course_analytics()

        assert analytics["total_courses"] == 5
        assert len(analytics["course_titles"]) == 3

    def test_query_prompt_formatting(self, test_config, mock_components):
        """Test that query prompts are properly formatted"""
        mock_components["ai_generator"].generate_response.return_value = "Response"

        rag = RAGSystem(test_config)
        rag.tool_manager.get_last_sources = Mock(return_value=[])

        rag.query("What is machine learning?")

        # Verify the prompt format
        call_args = mock_components["ai_generator"].generate_response.call_args
        prompt = call_args[1]["query"]
        assert "Answer this question about course materials:" in prompt
        assert "What is machine learning?" in prompt

    def test_session_management_flow(self, test_config, mock_components):
        """Test complete session management flow"""
        mock_components["ai_generator"].generate_response.return_value = (
            "Session response"
        )
        mock_components["session_manager"].get_conversation_history.return_value = (
            "Previous context"
        )

        rag = RAGSystem(test_config)
        rag.tool_manager.get_last_sources = Mock(return_value=[])

        query_text = "Continue our discussion"
        session_id = "test-session-123"

        response, sources = rag.query(query_text, session_id=session_id)

        # Verify session history was retrieved
        mock_components[
            "session_manager"
        ].get_conversation_history.assert_called_once_with(session_id)

        # Verify conversation was updated
        mock_components["session_manager"].add_exchange.assert_called_once_with(
            session_id, query_text, "Session response"
        )

    def test_tool_manager_integration(self, test_config, mock_components):
        """Test tool manager integration in query flow"""
        mock_components["ai_generator"].generate_response.return_value = (
            "Tool-enhanced response"
        )

        rag = RAGSystem(test_config)

        # Mock tool manager methods
        rag.tool_manager.get_tool_definitions = Mock(
            return_value=[{"name": "test_tool"}]
        )
        rag.tool_manager.get_last_sources = Mock(return_value=[])
        rag.tool_manager.reset_sources = Mock()

        response, sources = rag.query("Search for AI content")

        # Verify tool manager was properly integrated
        rag.tool_manager.get_tool_definitions.assert_called_once()
        rag.tool_manager.get_last_sources.assert_called_once()
        rag.tool_manager.reset_sources.assert_called_once()

        # Verify AI generator received tool definitions and manager
        call_args = mock_components["ai_generator"].generate_response.call_args
        assert call_args[1]["tools"] == [{"name": "test_tool"}]
        assert call_args[1]["tool_manager"] == rag.tool_manager


class TestRAGSystemRealIntegration:
    """Integration tests with minimal mocking for real component interaction"""

    def test_real_config_validation(self):
        """Test RAG system with real config but mocked external dependencies"""
        config = Config()
        config.ANTHROPIC_API_KEY = ""  # Empty API key
        config.CHROMA_PATH = tempfile.mkdtemp()

        with patch("rag_system.AIGenerator") as mock_ai_gen:
            mock_ai_gen.return_value = Mock()

            # Should initialize even with empty API key
            rag = RAGSystem(config)
            assert rag.config.ANTHROPIC_API_KEY == ""

    def test_missing_api_key_behavior(self):
        """Test behavior when API key is missing"""
        config = Config()
        config.ANTHROPIC_API_KEY = ""
        config.CHROMA_PATH = tempfile.mkdtemp()

        with patch("rag_system.AIGenerator") as mock_ai_gen:
            # Mock AI generator to raise API key error
            mock_ai_instance = Mock()
            mock_ai_instance.generate_response.side_effect = Exception(
                "Invalid API key"
            )
            mock_ai_gen.return_value = mock_ai_instance

            rag = RAGSystem(config)

            with pytest.raises(Exception) as exc_info:
                rag.query("Test query")

            assert "Invalid API key" in str(exc_info.value)

    @patch("rag_system.os.path.exists")
    def test_document_loading_integration(self, mock_exists):
        """Test document loading integration with real document processor"""
        mock_exists.return_value = False  # No docs folder

        config = Config()
        config.CHROMA_PATH = tempfile.mkdtemp()

        with patch("rag_system.AIGenerator"), patch(
            "rag_system.VectorStore"
        ) as mock_vector_store:

            mock_vector_store.return_value = Mock()

            rag = RAGSystem(config)

            # Test with non-existent folder
            courses, chunks = rag.add_course_folder("/nonexistent")
            assert courses == 0
            assert chunks == 0
