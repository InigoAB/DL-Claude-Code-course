"""
Integration tests with real components to catch configuration and data flow issues.
These tests use real ChromaDB, real document processing, and minimal mocking.
"""

import os
import shutil
import sys
import tempfile
from unittest.mock import Mock, patch

import pytest

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_generator import AIGenerator
from config import Config
from models import Course, CourseChunk, Lesson
from rag_system import RAGSystem
from search_tools import CourseSearchTool, ToolManager
from vector_store import SearchResults, VectorStore


class TestRealIntegrationIssues:
    """Test real integration issues that mocked tests miss"""

    @pytest.fixture
    def temp_chroma_path(self):
        """Create temporary ChromaDB path"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

    @pytest.fixture
    def real_config(self, temp_chroma_path):
        """Create a real config for testing"""
        config = Config()
        config.CHROMA_PATH = temp_chroma_path
        config.ANTHROPIC_API_KEY = "test-key"
        # NOTE: This test will reveal the MAX_RESULTS=0 bug
        return config

    @pytest.fixture
    def sample_course_data(self):
        """Create sample course data for testing"""
        course = Course(
            title="Test Course",
            course_link="https://example.com/course",
            instructor="Test Instructor",
            lessons=[
                Lesson(
                    lesson_number=1,
                    title="Introduction",
                    lesson_link="https://example.com/lesson1",
                ),
                Lesson(
                    lesson_number=2,
                    title="Advanced Topics",
                    lesson_link="https://example.com/lesson2",
                ),
            ],
        )

        chunks = [
            CourseChunk(
                content="This is an introduction to machine learning concepts and algorithms.",
                course_title="Test Course",
                lesson_number=1,
                chunk_index=0,
            ),
            CourseChunk(
                content="Advanced topics include neural networks, deep learning, and transformers.",
                course_title="Test Course",
                lesson_number=2,
                chunk_index=1,
            ),
            CourseChunk(
                content="Practical applications of AI in real-world scenarios and case studies.",
                course_title="Test Course",
                lesson_number=2,
                chunk_index=2,
            ),
        ]

        return course, chunks

    def test_config_max_results_bug(self, real_config):
        """Test reveals the MAX_RESULTS=0 configuration bug"""
        # This test should FAIL with current config
        assert (
            real_config.MAX_RESULTS != 0
        ), "MAX_RESULTS=0 will cause all searches to return empty results!"

    def test_vector_store_real_search_empty_results(
        self, real_config, sample_course_data
    ):
        """Test vector store with real ChromaDB - should reveal MAX_RESULTS=0 issue"""
        course, chunks = sample_course_data

        # Create real vector store
        vector_store = VectorStore(
            real_config.CHROMA_PATH,
            real_config.EMBEDDING_MODEL,
            real_config.MAX_RESULTS,
        )

        # Add real data
        vector_store.add_course_metadata(course)
        vector_store.add_course_content(chunks)

        # Search should return results, but will fail due to MAX_RESULTS=0
        results = vector_store.search("machine learning")

        if real_config.MAX_RESULTS == 0:
            # This will fail - reveals the bug!
            assert (
                not results.is_empty()
            ), "Search returned empty results due to MAX_RESULTS=0 bug!"
        else:
            assert (
                not results.is_empty()
            ), "Search should return results with valid data"
            assert len(results.documents) > 0

    def test_course_search_tool_real_execution(self, real_config, sample_course_data):
        """Test CourseSearchTool with real vector store"""
        course, chunks = sample_course_data

        # Create real vector store
        vector_store = VectorStore(
            real_config.CHROMA_PATH,
            real_config.EMBEDDING_MODEL,
            real_config.MAX_RESULTS,
        )

        # Add real data
        vector_store.add_course_metadata(course)
        vector_store.add_course_content(chunks)

        # Create and test search tool
        search_tool = CourseSearchTool(vector_store)
        result = search_tool.execute("machine learning concepts")

        if real_config.MAX_RESULTS == 0:
            # This reveals the root cause of "query failed"
            assert (
                "No relevant content found" not in result
            ), "CourseSearchTool failing due to MAX_RESULTS=0!"
        else:
            assert "No relevant content found" not in result
            assert "Test Course" in result
            assert len(search_tool.last_sources) > 0

    def test_course_search_tool_with_fixed_config(
        self, temp_chroma_path, sample_course_data
    ):
        """Test CourseSearchTool with corrected configuration"""
        course, chunks = sample_course_data

        # Create vector store with FIXED config
        vector_store = VectorStore(
            temp_chroma_path,
            "all-MiniLM-L6-v2",
            max_results=5,  # FIXED: Use proper max_results
        )

        # Add real data
        vector_store.add_course_metadata(course)
        vector_store.add_course_content(chunks)

        # Create and test search tool
        search_tool = CourseSearchTool(vector_store)
        result = search_tool.execute("machine learning concepts")

        # With fixed config, this should work
        assert "No relevant content found" not in result
        assert "Test Course" in result
        assert "machine learning" in result.lower()
        assert len(search_tool.last_sources) > 0

    @patch("ai_generator.anthropic.Anthropic")
    def test_ai_generator_tool_calling_real_flow(
        self, mock_anthropic, real_config, sample_course_data
    ):
        """Test AI generator tool calling with real tools and real vector store"""
        course, chunks = sample_course_data

        # Create real components
        vector_store = VectorStore(
            real_config.CHROMA_PATH,
            real_config.EMBEDDING_MODEL,
            real_config.MAX_RESULTS,
        )
        vector_store.add_course_metadata(course)
        vector_store.add_course_content(chunks)

        # Create real tool manager with real search tool
        tool_manager = ToolManager()
        search_tool = CourseSearchTool(vector_store)
        tool_manager.register_tool(search_tool)

        # Mock anthropic responses
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {"query": "machine learning"}
        mock_tool_block.id = "tool_123"
        mock_tool_response.content = [mock_tool_block]

        mock_final_response = Mock()
        mock_final_response.content = [
            Mock(text="Based on the search results, machine learning is...")
        ]

        mock_client = Mock()
        mock_client.messages.create.side_effect = [
            mock_tool_response,
            mock_final_response,
        ]
        mock_anthropic.return_value = mock_client

        # Test AI generator with real tools
        ai_generator = AIGenerator("test-key", "claude-sonnet-4-20250514")

        result = ai_generator.generate_response(
            "What is machine learning?",
            tools=tool_manager.get_tool_definitions(),
            tool_manager=tool_manager,
        )

        if real_config.MAX_RESULTS == 0:
            # With MAX_RESULTS=0, the search tool returns empty results
            # AI will get "No relevant content found" from the tool
            tool_result = tool_manager.execute_tool(
                "search_course_content", query="machine learning"
            )
            assert (
                "No relevant content found" in tool_result
            ), "Tool should return empty due to MAX_RESULTS=0"
        else:
            # With proper config, tool should return actual content
            assert result == "Based on the search results, machine learning is..."

    @patch("ai_generator.anthropic.Anthropic")
    def test_rag_system_end_to_end_real_flow(
        self, mock_anthropic, real_config, sample_course_data
    ):
        """Test complete RAG system end-to-end with real components"""
        course, chunks = sample_course_data

        # Mock only the Anthropic API
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {"query": "machine learning"}
        mock_tool_block.id = "tool_123"
        mock_tool_response.content = [mock_tool_block]

        mock_final_response = Mock()
        mock_final_response.content = [
            Mock(text="Here's what I found about machine learning...")
        ]

        mock_client = Mock()
        mock_client.messages.create.side_effect = [
            mock_tool_response,
            mock_final_response,
        ]
        mock_anthropic.return_value = mock_client

        # Create RAG system with real config (which has the bug)
        rag_system = RAGSystem(real_config)

        # Add real course data
        rag_system.vector_store.add_course_metadata(course)
        rag_system.vector_store.add_course_content(chunks)

        # Test end-to-end query
        response, sources = rag_system.query("What is machine learning?")

        if real_config.MAX_RESULTS == 0:
            # This reveals the end-to-end impact of the bug
            assert (
                len(sources) == 0
            ), "Sources empty due to MAX_RESULTS=0 causing search to return nothing"
        else:
            assert response == "Here's what I found about machine learning..."
            assert len(sources) > 0

    def test_empty_chromadb_behavior(self, real_config):
        """Test behavior with empty ChromaDB"""
        vector_store = VectorStore(
            real_config.CHROMA_PATH,
            real_config.EMBEDDING_MODEL,
            real_config.MAX_RESULTS,
        )

        search_tool = CourseSearchTool(vector_store)
        result = search_tool.execute("any query")

        # Should handle empty database gracefully
        assert "No relevant content found" in result
        assert len(search_tool.last_sources) == 0

    def test_invalid_chroma_path(self):
        """Test behavior with invalid ChromaDB path"""
        config = Config()
        config.CHROMA_PATH = "/invalid/path/that/does/not/exist"
        config.MAX_RESULTS = 5  # Use proper value

        # Should handle invalid path gracefully or raise appropriate error
        try:
            vector_store = VectorStore(
                config.CHROMA_PATH, config.EMBEDDING_MODEL, config.MAX_RESULTS
            )
            # If it doesn't raise error, test search behavior
            results = vector_store.search("test query")
            assert results.error is not None or results.is_empty()
        except Exception as e:
            # Expected behavior - should fail gracefully
            assert "path" in str(e).lower() or "permission" in str(e).lower()

    def test_missing_embedding_model(self, temp_chroma_path):
        """Test behavior with invalid embedding model"""
        try:
            vector_store = VectorStore(
                temp_chroma_path, "nonexistent-model", max_results=5
            )
            # If it creates without error, search should fail gracefully
            results = vector_store.search("test")
            assert results.error is not None
        except Exception as e:
            # Expected - should fail during model loading
            assert "model" in str(e).lower() or "embedding" in str(e).lower()
