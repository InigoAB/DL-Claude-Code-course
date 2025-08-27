import os
import sys
from unittest.mock import Mock, patch

import pytest

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Course, Lesson
from search_tools import CourseOutlineTool, CourseSearchTool, ToolManager
from vector_store import SearchResults


class TestCourseSearchTool:
    """Test suite for CourseSearchTool"""

    def test_get_tool_definition(self, mock_vector_store):
        """Test that tool definition is properly structured"""
        tool = CourseSearchTool(mock_vector_store)
        definition = tool.get_tool_definition()

        assert definition["name"] == "search_course_content"
        assert "description" in definition
        assert "input_schema" in definition
        assert definition["input_schema"]["required"] == ["query"]
        assert "query" in definition["input_schema"]["properties"]
        assert "course_name" in definition["input_schema"]["properties"]
        assert "lesson_number" in definition["input_schema"]["properties"]

    def test_execute_successful_search(self, mock_vector_store, mock_search_results):
        """Test successful search execution with results"""
        mock_vector_store.search.return_value = mock_search_results
        mock_vector_store.get_lesson_link.return_value = "https://example.com/lesson1"

        tool = CourseSearchTool(mock_vector_store)
        result = tool.execute("test query")

        # Verify search was called
        mock_vector_store.search.assert_called_once_with(
            query="test query", course_name=None, lesson_number=None
        )

        # Verify result contains expected content
        assert "Sample Course" in result
        assert "This is the introduction" in result
        assert len(tool.last_sources) == 2

    def test_execute_with_course_filter(self, mock_vector_store, mock_search_results):
        """Test search execution with course name filter"""
        mock_vector_store.search.return_value = mock_search_results

        tool = CourseSearchTool(mock_vector_store)
        result = tool.execute("test query", course_name="Sample Course")

        mock_vector_store.search.assert_called_once_with(
            query="test query", course_name="Sample Course", lesson_number=None
        )

    def test_execute_with_lesson_filter(self, mock_vector_store, mock_search_results):
        """Test search execution with lesson number filter"""
        mock_vector_store.search.return_value = mock_search_results

        tool = CourseSearchTool(mock_vector_store)
        result = tool.execute("test query", lesson_number=1)

        mock_vector_store.search.assert_called_once_with(
            query="test query", course_name=None, lesson_number=1
        )

    def test_execute_with_both_filters(self, mock_vector_store, mock_search_results):
        """Test search execution with both course and lesson filters"""
        mock_vector_store.search.return_value = mock_search_results

        tool = CourseSearchTool(mock_vector_store)
        result = tool.execute(
            "test query", course_name="Sample Course", lesson_number=2
        )

        mock_vector_store.search.assert_called_once_with(
            query="test query", course_name="Sample Course", lesson_number=2
        )

    def test_execute_empty_results(self, mock_vector_store, empty_search_results):
        """Test handling of empty search results"""
        mock_vector_store.search.return_value = empty_search_results

        tool = CourseSearchTool(mock_vector_store)
        result = tool.execute("nonexistent query")

        assert "No relevant content found" in result
        assert len(tool.last_sources) == 0

    def test_execute_empty_results_with_filters(
        self, mock_vector_store, empty_search_results
    ):
        """Test handling of empty results with filters applied"""
        mock_vector_store.search.return_value = empty_search_results

        tool = CourseSearchTool(mock_vector_store)
        result = tool.execute(
            "test query", course_name="Nonexistent Course", lesson_number=5
        )

        assert "No relevant content found" in result
        assert "in course 'Nonexistent Course'" in result
        assert "in lesson 5" in result

    def test_execute_search_error(self, mock_vector_store, error_search_results):
        """Test handling of search errors"""
        mock_vector_store.search.return_value = error_search_results

        tool = CourseSearchTool(mock_vector_store)
        result = tool.execute("test query")

        assert result == "Vector store connection failed"
        assert len(tool.last_sources) == 0

    def test_format_results_with_lesson_links(self, mock_vector_store):
        """Test result formatting includes lesson links when available"""
        # Create mock results with lesson data
        results = SearchResults(
            documents=["Sample content from lesson"],
            metadata=[
                {"course_title": "Test Course", "lesson_number": 1, "chunk_index": 0}
            ],
            distances=[0.1],
        )
        mock_vector_store.search.return_value = results
        mock_vector_store.get_lesson_link.return_value = "https://example.com/lesson1"

        tool = CourseSearchTool(mock_vector_store)
        result = tool.execute("test query")

        # Verify lesson link was requested
        mock_vector_store.get_lesson_link.assert_called_once_with("Test Course", 1)

        # Verify sources include the link
        assert len(tool.last_sources) == 1
        assert tool.last_sources[0]["text"] == "Test Course - Lesson 1"
        assert tool.last_sources[0]["link"] == "https://example.com/lesson1"

    def test_format_results_without_lesson_links(self, mock_vector_store):
        """Test result formatting when lesson links are not available"""
        results = SearchResults(
            documents=["Sample content"],
            metadata=[{"course_title": "Test Course", "lesson_number": 1}],
            distances=[0.1],
        )
        mock_vector_store.search.return_value = results
        mock_vector_store.get_lesson_link.return_value = None

        tool = CourseSearchTool(mock_vector_store)
        result = tool.execute("test query")

        # Verify sources don't include links
        assert len(tool.last_sources) == 1
        assert tool.last_sources[0]["link"] is None

    def test_format_results_lesson_link_error(self, mock_vector_store):
        """Test result formatting when getting lesson link throws error"""
        results = SearchResults(
            documents=["Sample content"],
            metadata=[{"course_title": "Test Course", "lesson_number": 1}],
            distances=[0.1],
        )
        mock_vector_store.search.return_value = results
        mock_vector_store.get_lesson_link.side_effect = Exception("Link fetch error")

        tool = CourseSearchTool(mock_vector_store)

        # Should not raise exception, should handle gracefully
        result = tool.execute("test query")

        assert len(tool.last_sources) == 1
        assert tool.last_sources[0]["link"] is None

    def test_sources_reset_between_searches(
        self, mock_vector_store, mock_search_results
    ):
        """Test that sources are properly reset between searches"""
        mock_vector_store.search.return_value = mock_search_results

        tool = CourseSearchTool(mock_vector_store)

        # First search
        tool.execute("first query")
        first_sources_count = len(tool.last_sources)

        # Second search with different results
        empty_results = SearchResults(documents=[], metadata=[], distances=[])
        mock_vector_store.search.return_value = empty_results
        tool.execute("second query")

        # Sources should be empty for second search
        assert len(tool.last_sources) == 0


class TestCourseOutlineTool:
    """Test suite for CourseOutlineTool"""

    def test_get_tool_definition(self, mock_vector_store):
        """Test that tool definition is properly structured"""
        tool = CourseOutlineTool(mock_vector_store)
        definition = tool.get_tool_definition()

        assert definition["name"] == "get_course_outline"
        assert "description" in definition
        assert definition["input_schema"]["required"] == ["course_title"]

    def test_execute_successful_outline(self, mock_vector_store, sample_course):
        """Test successful course outline retrieval"""
        # Mock course metadata
        course_metadata = [
            {
                "title": "Sample Course",
                "instructor": "Test Instructor",
                "course_link": "https://example.com/course",
                "lessons": [
                    {
                        "lesson_number": 1,
                        "lesson_title": "Introduction",
                        "lesson_link": "https://example.com/lesson1",
                    },
                    {
                        "lesson_number": 2,
                        "lesson_title": "Advanced Topics",
                        "lesson_link": "https://example.com/lesson2",
                    },
                ],
            }
        ]
        mock_vector_store.get_all_courses_metadata.return_value = course_metadata

        tool = CourseOutlineTool(mock_vector_store)
        result = tool.execute("Sample Course")

        assert "Sample Course" in result
        assert "Introduction" in result
        assert "Advanced Topics" in result
        assert "Course Link:" in result

    def test_execute_course_not_found(self, mock_vector_store):
        """Test handling when course is not found"""
        course_metadata = [
            {
                "title": "Different Course",
                "instructor": "Test Instructor",
                "course_link": "https://example.com/course",
                "lessons": [],
            }
        ]
        mock_vector_store.get_all_courses_metadata.return_value = course_metadata

        tool = CourseOutlineTool(mock_vector_store)
        result = tool.execute("Nonexistent Course")

        assert "No course found matching" in result
        assert "Different Course" in result

    def test_execute_no_courses_available(self, mock_vector_store):
        """Test handling when no courses are available"""
        mock_vector_store.get_all_courses_metadata.return_value = []

        tool = CourseOutlineTool(mock_vector_store)
        result = tool.execute("Any Course")

        assert "No courses available in the system" in result

    def test_execute_metadata_error(self, mock_vector_store):
        """Test handling of metadata retrieval errors"""
        mock_vector_store.get_all_courses_metadata.side_effect = Exception(
            "Database error"
        )

        tool = CourseOutlineTool(mock_vector_store)
        result = tool.execute("Sample Course")

        assert "Error retrieving course outline" in result


class TestToolManager:
    """Test suite for ToolManager"""

    def test_register_tool(self, mock_vector_store):
        """Test tool registration"""
        manager = ToolManager()
        tool = CourseSearchTool(mock_vector_store)

        manager.register_tool(tool)

        assert "search_course_content" in manager.tools
        assert manager.tools["search_course_content"] == tool

    def test_get_tool_definitions(self, mock_vector_store):
        """Test getting all tool definitions"""
        manager = ToolManager()
        search_tool = CourseSearchTool(mock_vector_store)
        outline_tool = CourseOutlineTool(mock_vector_store)

        manager.register_tool(search_tool)
        manager.register_tool(outline_tool)

        definitions = manager.get_tool_definitions()

        assert len(definitions) == 2
        tool_names = [d["name"] for d in definitions]
        assert "search_course_content" in tool_names
        assert "get_course_outline" in tool_names

    def test_execute_tool(self, mock_vector_store, mock_search_results):
        """Test tool execution via manager"""
        mock_vector_store.search.return_value = mock_search_results

        manager = ToolManager()
        tool = CourseSearchTool(mock_vector_store)
        manager.register_tool(tool)

        result = manager.execute_tool("search_course_content", query="test query")

        assert "Sample Course" in result

    def test_execute_nonexistent_tool(self, mock_vector_store):
        """Test handling of nonexistent tool execution"""
        manager = ToolManager()

        result = manager.execute_tool("nonexistent_tool", query="test")

        assert "Tool 'nonexistent_tool' not found" in result

    def test_get_last_sources(self, mock_vector_store, mock_search_results):
        """Test collecting sources from multiple tools"""
        mock_vector_store.search.return_value = mock_search_results

        manager = ToolManager()
        search_tool = CourseSearchTool(mock_vector_store)
        manager.register_tool(search_tool)

        # Execute search to generate sources
        manager.execute_tool("search_course_content", query="test query")

        sources = manager.get_last_sources()
        assert len(sources) == 2

    def test_reset_sources(self, mock_vector_store, mock_search_results):
        """Test resetting sources from all tools"""
        mock_vector_store.search.return_value = mock_search_results

        manager = ToolManager()
        search_tool = CourseSearchTool(mock_vector_store)
        manager.register_tool(search_tool)

        # Execute search to generate sources
        manager.execute_tool("search_course_content", query="test query")
        assert len(manager.get_last_sources()) > 0

        # Reset sources
        manager.reset_sources()
        assert len(manager.get_last_sources()) == 0
