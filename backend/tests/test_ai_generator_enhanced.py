"""
Enhanced tests for AIGenerator focusing on tool calling edge cases and error conditions.
These tests complement the existing tests by focusing on real-world failure scenarios.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_generator import AIGenerator
from search_tools import ToolManager, CourseSearchTool
from vector_store import VectorStore, SearchResults


class TestAIGeneratorToolCallingEdgeCases:
    """Enhanced tests for AI generator tool calling functionality"""

    @pytest.fixture
    def sample_tool_definitions(self):
        """Sample tool definitions for testing"""
        return [
            {
                "name": "search_course_content",
                "description": "Search course materials",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"},
                        "course_name": {"type": "string", "description": "Course filter"}
                    },
                    "required": ["query"]
                }
            }
        ]

    @patch('ai_generator.anthropic.Anthropic')
    def test_empty_tool_response_handling(self, mock_anthropic, sample_tool_definitions):
        """Test handling when tool returns empty results"""
        # Mock tool use response
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {"query": "nonexistent content"}
        mock_tool_block.id = "tool_123"
        mock_tool_response.content = [mock_tool_block]
        
        # Mock final response
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="I couldn't find any relevant content.")]
        
        mock_client = Mock()
        mock_client.messages.create.side_effect = [mock_tool_response, mock_final_response]
        mock_anthropic.return_value = mock_client
        
        # Mock tool manager that returns empty results
        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.return_value = "No relevant content found."
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        result = generator.generate_response(
            "Find information about quantum computing",
            tools=sample_tool_definitions,
            tool_manager=mock_tool_manager
        )
        
        assert result == "I couldn't find any relevant content."
        mock_tool_manager.execute_tool.assert_called_once_with(
            "search_course_content",
            query="nonexistent content"
        )

    @patch('ai_generator.anthropic.Anthropic')
    def test_tool_manager_none_handling(self, mock_anthropic, sample_tool_definitions):
        """Test handling when tool_manager is None but tools require execution"""
        # Mock tool use response
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {"query": "test"}
        mock_tool_block.id = "tool_123"
        mock_tool_response.content = [mock_tool_block]
        
        mock_client = Mock()
        mock_client.messages.create.return_value = mock_tool_response
        mock_anthropic.return_value = mock_client
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        # This should return the initial response since no tool manager is provided
        result = generator.generate_response(
            "Search for content",
            tools=sample_tool_definitions,
            tool_manager=None
        )
        
        # Should return the tool use response content (not execute tools)
        assert mock_client.messages.create.call_count == 1

    @patch('ai_generator.anthropic.Anthropic')
    def test_malformed_tool_response(self, mock_anthropic, sample_tool_definitions):
        """Test handling of malformed tool response from API"""
        # Mock malformed tool response
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_response.content = [Mock(type="text", text="Not a tool use block")]
        
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Handled gracefully")]
        
        mock_client = Mock()
        mock_client.messages.create.side_effect = [mock_tool_response, mock_final_response]
        mock_anthropic.return_value = mock_client
        
        mock_tool_manager = Mock()
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        result = generator.generate_response(
            "Test query",
            tools=sample_tool_definitions,
            tool_manager=mock_tool_manager
        )
        
        # Should handle malformed response gracefully
        assert result == "Handled gracefully"
        # Tool manager should not be called for malformed tool blocks
        mock_tool_manager.execute_tool.assert_not_called()

    @patch('ai_generator.anthropic.Anthropic')
    def test_tool_execution_exception(self, mock_anthropic, sample_tool_definitions):
        """Test handling when tool execution raises exception"""
        # Mock tool use response
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {"query": "test"}
        mock_tool_block.id = "tool_123"
        mock_tool_response.content = [mock_tool_block]
        
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Error handled gracefully")]
        
        mock_client = Mock()
        mock_client.messages.create.side_effect = [mock_tool_response, mock_final_response]
        mock_anthropic.return_value = mock_client
        
        # Mock tool manager that raises exception
        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.side_effect = Exception("Tool execution failed")
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        # Should handle tool execution error gracefully
        with pytest.raises(Exception):
            generator.generate_response(
                "Test query",
                tools=sample_tool_definitions,
                tool_manager=mock_tool_manager
            )

    @patch('ai_generator.anthropic.Anthropic')
    def test_api_timeout_handling(self, mock_anthropic, sample_tool_definitions):
        """Test handling of API timeout errors"""
        mock_client = Mock()
        mock_client.messages.create.side_effect = Exception("Request timeout")
        mock_anthropic.return_value = mock_client
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        with pytest.raises(Exception) as exc_info:
            generator.generate_response("Test query", tools=sample_tool_definitions)
        
        assert "timeout" in str(exc_info.value).lower()

    @patch('ai_generator.anthropic.Anthropic')
    def test_api_rate_limit_handling(self, mock_anthropic):
        """Test handling of API rate limit errors"""
        mock_client = Mock()
        mock_client.messages.create.side_effect = Exception("Rate limit exceeded")
        mock_anthropic.return_value = mock_client
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        with pytest.raises(Exception) as exc_info:
            generator.generate_response("Test query")
        
        assert "rate limit" in str(exc_info.value).lower()

    @patch('ai_generator.anthropic.Anthropic')
    def test_invalid_tool_name_in_response(self, mock_anthropic, sample_tool_definitions):
        """Test handling when API returns invalid tool name"""
        # Mock tool response with invalid tool name
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "nonexistent_tool"
        mock_tool_block.input = {"query": "test"}
        mock_tool_block.id = "tool_123"
        mock_tool_response.content = [mock_tool_block]
        
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Tool not found handled")]
        
        mock_client = Mock()
        mock_client.messages.create.side_effect = [mock_tool_response, mock_final_response]
        mock_anthropic.return_value = mock_client
        
        # Mock tool manager that returns error for unknown tool
        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.return_value = "Tool 'nonexistent_tool' not found"
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        result = generator.generate_response(
            "Test query",
            tools=sample_tool_definitions,
            tool_manager=mock_tool_manager
        )
        
        assert result == "Tool not found handled"
        mock_tool_manager.execute_tool.assert_called_once_with("nonexistent_tool", query="test")

    @patch('ai_generator.anthropic.Anthropic')
    def test_empty_conversation_history(self, mock_anthropic):
        """Test handling of empty conversation history"""
        mock_response = Mock()
        mock_response.content = [Mock(text="Response without history")]
        mock_response.stop_reason = "end_turn"
        
        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        result = generator.generate_response("Test query", conversation_history="")
        
        assert result == "Response without history"
        
        # Verify system prompt doesn't include empty history
        call_args = mock_client.messages.create.call_args
        system_content = call_args[1]["system"]
        assert "Previous conversation:" not in system_content

    @patch('ai_generator.anthropic.Anthropic')
    def test_very_long_conversation_history(self, mock_anthropic):
        """Test handling of very long conversation history"""
        mock_response = Mock()
        mock_response.content = [Mock(text="Response with long history")]
        mock_response.stop_reason = "end_turn"
        
        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        # Create very long history
        long_history = "User: " + "What is AI? " * 1000 + "\nAssistant: " + "AI is artificial intelligence. " * 1000
        
        result = generator.generate_response("Follow up question", conversation_history=long_history)
        
        assert result == "Response with long history"
        
        # Verify history was included
        call_args = mock_client.messages.create.call_args
        system_content = call_args[1]["system"]
        assert "Previous conversation:" in system_content

    @patch('ai_generator.anthropic.Anthropic')
    def test_tool_input_parameter_validation(self, mock_anthropic, sample_tool_definitions):
        """Test that tool input parameters are properly passed"""
        # Mock tool use with multiple parameters
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {
            "query": "machine learning",
            "course_name": "AI Fundamentals",
            "lesson_number": 3
        }
        mock_tool_block.id = "tool_123"
        mock_tool_response.content = [mock_tool_block]
        
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Found content")]
        
        mock_client = Mock()
        mock_client.messages.create.side_effect = [mock_tool_response, mock_final_response]
        mock_anthropic.return_value = mock_client
        
        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.return_value = "Search results"
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        result = generator.generate_response(
            "Find ML content in AI course lesson 3",
            tools=sample_tool_definitions,
            tool_manager=mock_tool_manager
        )
        
        # Verify all parameters were passed correctly
        mock_tool_manager.execute_tool.assert_called_once_with(
            "search_course_content",
            query="machine learning",
            course_name="AI Fundamentals",
            lesson_number=3
        )

    def test_system_prompt_completeness(self):
        """Test that system prompt contains all necessary instructions"""
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        # Verify key components of system prompt
        assert "course materials" in generator.SYSTEM_PROMPT
        assert "Content Search Tool" in generator.SYSTEM_PROMPT
        assert "Course Outline Tool" in generator.SYSTEM_PROMPT
        assert "One search per query maximum" in generator.SYSTEM_PROMPT
        assert "direct answers only" in generator.SYSTEM_PROMPT
        assert "Brief, Concise and focused" in generator.SYSTEM_PROMPT
        
        # Verify response guidelines
        assert "educational content" in generator.SYSTEM_PROMPT.lower()
        assert "clear" in generator.SYSTEM_PROMPT.lower()
        assert "example-supported" in generator.SYSTEM_PROMPT.lower()

    @patch('ai_generator.anthropic.Anthropic')
    def test_concurrent_tool_calls_handling(self, mock_anthropic, sample_tool_definitions):
        """Test handling of concurrent/multiple tool calls in single response"""
        # Create multiple tool blocks
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        
        tool_block1 = Mock()
        tool_block1.type = "tool_use"
        tool_block1.name = "search_course_content"
        tool_block1.input = {"query": "AI basics"}
        tool_block1.id = "tool_1"
        
        tool_block2 = Mock()
        tool_block2.type = "tool_use"
        tool_block2.name = "search_course_content"
        tool_block2.input = {"query": "machine learning"}
        tool_block2.id = "tool_2"
        
        mock_tool_response.content = [tool_block1, tool_block2]
        
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Combined results from multiple searches")]
        
        mock_client = Mock()
        mock_client.messages.create.side_effect = [mock_tool_response, mock_final_response]
        mock_anthropic.return_value = mock_client
        
        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.side_effect = ["Result 1", "Result 2"]
        
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")
        
        result = generator.generate_response(
            "Compare AI basics and machine learning",
            tools=sample_tool_definitions,
            tool_manager=mock_tool_manager
        )
        
        assert result == "Combined results from multiple searches"
        assert mock_tool_manager.execute_tool.call_count == 2
        
        # Verify both tools were called with correct parameters
        calls = mock_tool_manager.execute_tool.call_args_list
        assert calls[0][0] == ("search_course_content",)
        assert calls[0][1] == {"query": "AI basics"}
        assert calls[1][0] == ("search_course_content",)
        assert calls[1][1] == {"query": "machine learning"}