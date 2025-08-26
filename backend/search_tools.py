from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Protocol

from vector_store import SearchResults, VectorStore


class Tool(ABC):
    """Abstract base class for all tools"""

    @abstractmethod
    def get_tool_definition(self) -> Dict[str, Any]:
        """Return Anthropic tool definition for this tool"""
        pass

    @abstractmethod
    def execute(self, **kwargs) -> str:
        """Execute the tool with given parameters"""
        pass


class CourseSearchTool(Tool):
    """Tool for searching course content with semantic course name matching"""

    def __init__(self, vector_store: VectorStore):
        self.store = vector_store
        self.last_sources = []  # Track sources from last search

    def get_tool_definition(self) -> Dict[str, Any]:
        """Return Anthropic tool definition for this tool"""
        return {
            "name": "search_course_content",
            "description": "Search course materials with smart course name matching and lesson filtering",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "What to search for in the course content",
                    },
                    "course_name": {
                        "type": "string",
                        "description": "Course title (partial matches work, e.g. 'MCP', 'Introduction')",
                    },
                    "lesson_number": {
                        "type": "integer",
                        "description": "Specific lesson number to search within (e.g. 1, 2, 3)",
                    },
                },
                "required": ["query"],
            },
        }

    def execute(
        self,
        query: str,
        course_name: Optional[str] = None,
        lesson_number: Optional[int] = None,
    ) -> str:
        """
        Execute the search tool with given parameters.

        Args:
            query: What to search for
            course_name: Optional course filter
            lesson_number: Optional lesson filter

        Returns:
            Formatted search results or error message
        """

        # Use the vector store's unified search interface
        results = self.store.search(
            query=query, course_name=course_name, lesson_number=lesson_number
        )

        # Handle errors
        if results.error:
            return results.error

        # Handle empty results
        if results.is_empty():
            filter_info = ""
            if course_name:
                filter_info += f" in course '{course_name}'"
            if lesson_number:
                filter_info += f" in lesson {lesson_number}"
            return f"No relevant content found{filter_info}."

        # Format and return results
        return self._format_results(results)

    def _format_results(self, results: SearchResults) -> str:
        """Format search results with course and lesson context"""
        formatted = []
        sources = []  # Track sources for the UI (now with links)

        for doc, meta in zip(results.documents, results.metadata):
            course_title = meta.get("course_title", "unknown")
            lesson_num = meta.get("lesson_number")

            # Build context header
            header = f"[{course_title}"
            if lesson_num is not None:
                header += f" - Lesson {lesson_num}"
            header += "]"

            # Build source object with text and optional link
            source_text = course_title
            if lesson_num is not None:
                source_text += f" - Lesson {lesson_num}"

            source_obj = {"text": source_text, "link": None}

            # Try to get lesson link if lesson number exists
            if lesson_num is not None:
                try:
                    lesson_link = self.store.get_lesson_link(course_title, lesson_num)
                    if lesson_link:
                        source_obj["link"] = lesson_link
                except Exception as e:
                    print(f"Error getting lesson link: {e}")

            sources.append(source_obj)
            formatted.append(f"{header}\n{doc}")

        # Store sources for retrieval
        self.last_sources = sources

        return "\n\n".join(formatted)


class CourseOutlineTool(Tool):
    """Tool for retrieving course outlines with lesson details"""

    def __init__(self, vector_store: VectorStore):
        self.store = vector_store
        self.last_sources = []  # Track sources for the UI

    def get_tool_definition(self) -> Dict[str, Any]:
        """Return Anthropic tool definition for this tool"""
        return {
            "name": "get_course_outline",
            "description": "Get complete course outline including title, link, and all lessons",
            "input_schema": {
                "type": "object",
                "properties": {
                    "course_title": {
                        "type": "string",
                        "description": "Course title to get outline for (partial matches work)",
                    }
                },
                "required": ["course_title"],
            },
        }

    def execute(self, course_title: str) -> str:
        """
        Execute the outline tool to get course structure.

        Args:
            course_title: Course title to search for

        Returns:
            Formatted course outline or error message
        """
        try:
            # Get all courses metadata
            all_courses = self.store.get_all_courses_metadata()

            if not all_courses:
                return "No courses available in the system."

            # Find matching course using fuzzy matching
            matching_course = self._find_matching_course(course_title, all_courses)

            if not matching_course:
                available_courses = [course["title"] for course in all_courses]
                return f"No course found matching '{course_title}'. Available courses: {', '.join(available_courses)}"

            # Format and return the course outline
            return self._format_course_outline(matching_course)

        except Exception as e:
            return f"Error retrieving course outline: {str(e)}"

    def _find_matching_course(
        self, query_title: str, courses: List[Dict]
    ) -> Optional[Dict]:
        """Find course that best matches the query title"""
        query_lower = query_title.lower()

        # First try exact match
        for course in courses:
            if course["title"].lower() == query_lower:
                return course

        # Then try partial match
        for course in courses:
            if query_lower in course["title"].lower():
                return course

        # Finally try word-based matching
        query_words = set(query_lower.split())
        for course in courses:
            course_words = set(course["title"].lower().split())
            if query_words.intersection(course_words):
                return course

        return None

    def _format_course_outline(self, course: Dict) -> str:
        """Format course outline with title, link, and lessons"""
        title = course.get("title", "Unknown Course")
        course_link = course.get("course_link", "No link available")
        lessons = course.get("lessons", [])

        # Debug logging
        print(f"DEBUG CourseOutlineTool - Course: {title}")
        print(f"DEBUG CourseOutlineTool - Raw course_link: '{course_link}'")
        print(f"DEBUG CourseOutlineTool - Course data keys: {list(course.keys())}")

        # Build the outline with course link in main content
        outline = f"**{title}**\n\n"

        # Add course link to main content if available
        if (
            course_link
            and course_link.strip()
            and course_link not in ["No link available", "None", "null"]
            and course_link.startswith("http")
        ):
            outline += f"Course Link: [{title}]({course_link})\n\n"
        else:
            outline += "Course Link: Available through the course platform\n\n"

        if lessons:
            outline += "**Lessons:**\n"
            # Sort lessons by lesson number
            sorted_lessons = sorted(lessons, key=lambda x: x.get("lesson_number", 0))
            for lesson in sorted_lessons:
                lesson_num = lesson.get("lesson_number", "?")
                lesson_title = lesson.get("lesson_title", "Untitled Lesson")
                outline += f"{lesson_num}. {lesson_title}\n"
        else:
            outline += "No lesson information available."

        # Add course link as a source for better visual presentation
        sources = []
        try:
            # More robust condition checking
            if (
                course_link
                and course_link.strip()
                and course_link not in ["No link available", "None", "null"]
                and course_link.startswith("http")
            ):

                source_obj = {"text": f"🔗 {title} - Course Link", "link": course_link}
                sources.append(source_obj)
                print(f"DEBUG CourseOutlineTool - Added source: {source_obj}")
            else:
                print(
                    f"DEBUG CourseOutlineTool - Course link failed condition check: '{course_link}'"
                )
        except Exception as e:
            print(f"DEBUG CourseOutlineTool - Error creating source: {e}")

        # Store sources for retrieval by the UI
        self.last_sources = sources
        print(f"DEBUG CourseOutlineTool - Final sources: {self.last_sources}")

        return outline


class ToolManager:
    """Manages available tools for the AI"""

    def __init__(self):
        self.tools = {}

    def register_tool(self, tool: Tool):
        """Register any tool that implements the Tool interface"""
        tool_def = tool.get_tool_definition()
        tool_name = tool_def.get("name")
        if not tool_name:
            raise ValueError("Tool must have a 'name' in its definition")
        self.tools[tool_name] = tool

    def get_tool_definitions(self) -> list:
        """Get all tool definitions for Anthropic tool calling"""
        return [tool.get_tool_definition() for tool in self.tools.values()]

    def execute_tool(self, tool_name: str, **kwargs) -> str:
        """Execute a tool by name with given parameters"""
        if tool_name not in self.tools:
            return f"Tool '{tool_name}' not found"

        return self.tools[tool_name].execute(**kwargs)

    def get_last_sources(self) -> list:
        """Get sources from the last search operation"""
        # Check all tools for last_sources attribute
        all_sources = []
        for tool_name, tool in self.tools.items():
            if hasattr(tool, "last_sources") and tool.last_sources:
                print(
                    f"DEBUG ToolManager - Found sources from {tool_name}: {tool.last_sources}"
                )
                all_sources.extend(tool.last_sources)

        print(f"DEBUG ToolManager - Total sources collected: {all_sources}")
        return all_sources

    def reset_sources(self):
        """Reset sources from all tools that track sources"""
        for tool in self.tools.values():
            if hasattr(tool, "last_sources"):
                tool.last_sources = []
