import os
import sys
from unittest.mock import MagicMock, Mock, patch

import pytest

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_generator import AIGenerator
from search_tools import CourseSearchTool, ToolManager


class TestAIGenerator:
    """Test suite for AIGenerator"""

    def test_init_with_valid_credentials(self):
        """Test AIGenerator initialization with valid credentials"""
        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")

        assert generator.model == "claude-sonnet-4-20250514"
        assert generator.base_params["model"] == "claude-sonnet-4-20250514"
        assert generator.base_params["temperature"] == 0
        assert generator.base_params["max_tokens"] == 800

    @patch("ai_generator.anthropic.Anthropic")
    def test_generate_response_without_tools(self, mock_anthropic):
        """Test response generation without tools"""
        # Mock the response
        mock_response = Mock()
        mock_response.content = [Mock(text="This is a direct response.")]
        mock_response.stop_reason = "end_turn"

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        result = generator.generate_response("What is AI?")

        assert result == "This is a direct response."
        mock_client.messages.create.assert_called_once()

    @patch("ai_generator.anthropic.Anthropic")
    def test_generate_response_with_conversation_history(self, mock_anthropic):
        """Test response generation with conversation history"""
        mock_response = Mock()
        mock_response.content = [Mock(text="Response with context.")]
        mock_response.stop_reason = "end_turn"

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        history = "User: Previous question\nAssistant: Previous answer"

        result = generator.generate_response(
            "Follow-up question", conversation_history=history
        )

        # Verify history was included in system prompt
        call_args = mock_client.messages.create.call_args
        system_content = call_args[1]["system"]
        assert "Previous conversation:" in system_content
        assert history in system_content

    @patch("ai_generator.anthropic.Anthropic")
    def test_generate_response_with_tools_no_tool_use(self, mock_anthropic):
        """Test response generation with tools available but no tool use"""
        mock_response = Mock()
        mock_response.content = [Mock(text="Direct answer without using tools.")]
        mock_response.stop_reason = "end_turn"

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")

        # Mock tool definitions
        tools = [{"name": "search_course_content", "description": "Search courses"}]

        result = generator.generate_response("General question", tools=tools)

        assert result == "Direct answer without using tools."

        # Verify tools were passed to API
        call_args = mock_client.messages.create.call_args
        assert "tools" in call_args[1]
        assert call_args[1]["tools"] == tools

    @patch("ai_generator.anthropic.Anthropic")
    def test_generate_response_with_tool_use(self, mock_anthropic):
        """Test response generation that uses tools"""
        # First response - tool use
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {"query": "test search"}
        mock_tool_block.id = "tool_123"
        mock_tool_response.content = [mock_tool_block]

        # Second response - final answer
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Answer based on search results.")]

        mock_client = Mock()
        mock_client.messages.create.side_effect = [
            mock_tool_response,
            mock_final_response,
        ]
        mock_anthropic.return_value = mock_client

        # Mock tool manager
        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.return_value = "Search results here"

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        tools = [{"name": "search_course_content", "description": "Search courses"}]

        result = generator.generate_response(
            "Search for AI content", tools=tools, tool_manager=mock_tool_manager
        )

        assert result == "Answer based on search results."

        # Verify tool was executed
        mock_tool_manager.execute_tool.assert_called_once_with(
            "search_course_content", query="test search"
        )

        # Verify two API calls were made
        assert mock_client.messages.create.call_count == 2

    @patch("ai_generator.anthropic.Anthropic")
    def test_generate_response_tool_execution_error(self, mock_anthropic):
        """Test handling of tool execution errors"""
        # Mock tool use response
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {"query": "test"}
        mock_tool_block.id = "tool_123"
        mock_tool_response.content = [mock_tool_block]

        # Mock final response
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Handled error gracefully.")]

        mock_client = Mock()
        mock_client.messages.create.side_effect = [
            mock_tool_response,
            mock_final_response,
        ]
        mock_anthropic.return_value = mock_client

        # Mock tool manager that raises error
        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.return_value = "Tool execution failed"

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        tools = [{"name": "search_course_content"}]

        result = generator.generate_response(
            "Search query", tools=tools, tool_manager=mock_tool_manager
        )

        assert result == "Handled error gracefully."

    @patch("ai_generator.anthropic.Anthropic")
    def test_api_error_handling(self, mock_anthropic):
        """Test handling of Anthropic API errors"""
        mock_client = Mock()
        mock_client.messages.create.side_effect = Exception(
            "API Error: Rate limit exceeded"
        )
        mock_anthropic.return_value = mock_client

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")

        with pytest.raises(Exception) as exc_info:
            generator.generate_response("Test query")

        assert "API Error: Rate limit exceeded" in str(exc_info.value)

    @patch("ai_generator.anthropic.Anthropic")
    def test_invalid_api_key_handling(self, mock_anthropic):
        """Test handling of invalid API key"""
        mock_client = Mock()
        mock_client.messages.create.side_effect = Exception("Invalid API key")
        mock_anthropic.return_value = mock_client

        generator = AIGenerator("invalid-key", "claude-sonnet-4-20250514")

        with pytest.raises(Exception) as exc_info:
            generator.generate_response("Test query")

        assert "Invalid API key" in str(exc_info.value)

    @patch("ai_generator.anthropic.Anthropic")
    def test_empty_api_key(self, mock_anthropic):
        """Test behavior with empty API key"""
        generator = AIGenerator("", "claude-sonnet-4-20250514")
        # Should initialize without error, but may fail on API call
        assert generator.model == "claude-sonnet-4-20250514"

    @patch("ai_generator.anthropic.Anthropic")
    def test_multiple_tool_calls(self, mock_anthropic):
        """Test handling multiple tool calls in single response"""
        # Mock response with multiple tool calls
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"

        tool_block1 = Mock()
        tool_block1.type = "tool_use"
        tool_block1.name = "search_course_content"
        tool_block1.input = {"query": "first search"}
        tool_block1.id = "tool_1"

        tool_block2 = Mock()
        tool_block2.type = "tool_use"
        tool_block2.name = "get_course_outline"
        tool_block2.input = {"course_title": "Sample Course"}
        tool_block2.id = "tool_2"

        mock_tool_response.content = [tool_block1, tool_block2]

        # Mock final response
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Combined results.")]

        mock_client = Mock()
        mock_client.messages.create.side_effect = [
            mock_tool_response,
            mock_final_response,
        ]
        mock_anthropic.return_value = mock_client

        # Mock tool manager
        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.side_effect = ["Search result", "Outline result"]

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        tools = [{"name": "search_course_content"}, {"name": "get_course_outline"}]

        result = generator.generate_response(
            "Complex query", tools=tools, tool_manager=mock_tool_manager
        )

        assert result == "Combined results."
        assert mock_tool_manager.execute_tool.call_count == 2

    def test_system_prompt_content(self):
        """Test that system prompt contains expected guidance"""
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")

        assert "course materials" in generator.SYSTEM_PROMPT
        assert "Content Search Tool" in generator.SYSTEM_PROMPT
        assert "Course Outline Tool" in generator.SYSTEM_PROMPT
        assert "Multi-Step Search Protocol" in generator.SYSTEM_PROMPT

    @patch("ai_generator.anthropic.Anthropic")
    def test_base_params_structure(self, mock_anthropic):
        """Test that base parameters are properly structured"""
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")

        expected_params = {
            "model": "claude-sonnet-4-20250514",
            "temperature": 0,
            "max_tokens": 800,
        }

        assert generator.base_params == expected_params

    @patch("ai_generator.anthropic.Anthropic")
    def test_handle_tool_execution_message_building(self, mock_anthropic):
        """Test that tool execution builds messages correctly"""
        # This tests the _handle_tool_execution method indirectly
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {"query": "test"}
        mock_tool_block.id = "tool_123"
        mock_tool_response.content = [mock_tool_block]

        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Final answer.")]

        mock_client = Mock()
        mock_client.messages.create.side_effect = [
            mock_tool_response,
            mock_final_response,
        ]
        mock_anthropic.return_value = mock_client

        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.return_value = "Tool result"

        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")

        result = generator.generate_response(
            "Test query",
            tools=[{"name": "search_course_content"}],
            tool_manager=mock_tool_manager,
        )

        # Verify the second API call has the expected message structure
        second_call = mock_client.messages.create.call_args_list[1]
        messages = second_call[1]["messages"]

        # Should have: original user message, assistant tool use, user tool results
        assert len(messages) == 3
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "assistant"
        assert messages[2]["role"] == "user"

    # Sequential Tool Calling Tests
    @patch("ai_generator.anthropic.Anthropic")
    def test_sequential_tool_calling_two_rounds(self, mock_anthropic):
        """Test two-round sequential tool calling"""
        # Round 1: tool use
        mock_round1_response = Mock()
        mock_round1_response.stop_reason = "tool_use"
        mock_tool_block1 = Mock()
        mock_tool_block1.type = "tool_use"
        mock_tool_block1.name = "get_course_outline"
        mock_tool_block1.input = {"course_title": "Course X"}
        mock_tool_block1.id = "tool_1"
        mock_round1_response.content = [mock_tool_block1]

        # Round 2: tool use
        mock_round2_response = Mock()
        mock_round2_response.stop_reason = "tool_use"
        mock_tool_block2 = Mock()
        mock_tool_block2.type = "tool_use"
        mock_tool_block2.name = "search_course_content"
        mock_tool_block2.input = {"query": "Advanced Functions"}
        mock_tool_block2.id = "tool_2"
        mock_round2_response.content = [mock_tool_block2]

        # Final response
        mock_final_response = Mock()
        mock_final_response.content = [
            Mock(text="Based on both searches, here's the answer.")
        ]

        mock_client = Mock()
        mock_client.messages.create.side_effect = [
            mock_round1_response,
            mock_round2_response,
            mock_final_response,
        ]
        mock_anthropic.return_value = mock_client

        # Mock tool manager
        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.side_effect = [
            "Course X outline with lesson 4: Advanced Functions",
            "Found courses covering Advanced Functions",
        ]

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        tools = [{"name": "get_course_outline"}, {"name": "search_course_content"}]

        result = generator.generate_response(
            "Search for a course that discusses the same topic as lesson 4 of course X",
            tools=tools,
            tool_manager=mock_tool_manager,
            max_rounds=2,
        )

        assert result == "Based on both searches, here's the answer."
        assert mock_tool_manager.execute_tool.call_count == 2
        assert mock_client.messages.create.call_count == 3  # 2 rounds + final

    @patch("ai_generator.anthropic.Anthropic")
    def test_sequential_tool_calling_early_termination(self, mock_anthropic):
        """Test early termination when Claude doesn't use tools in first round"""
        # Round 1: direct response (no tool use)
        mock_round1_response = Mock()
        mock_round1_response.stop_reason = "end_turn"
        mock_round1_response.content = [
            Mock(text="I can answer this directly without tools.")
        ]

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_round1_response
        mock_anthropic.return_value = mock_client

        mock_tool_manager = Mock()

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        tools = [{"name": "search_course_content"}]

        result = generator.generate_response(
            "What is machine learning?",
            tools=tools,
            tool_manager=mock_tool_manager,
            max_rounds=2,
        )

        assert result == "I can answer this directly without tools."
        assert mock_tool_manager.execute_tool.call_count == 0
        assert mock_client.messages.create.call_count == 1  # Only one round

    @patch("ai_generator.anthropic.Anthropic")
    def test_sequential_tool_calling_tool_error_handling(self, mock_anthropic):
        """Test error handling when tool execution fails"""
        # Round 1: tool use
        mock_round1_response = Mock()
        mock_round1_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {"query": "test"}
        mock_tool_block.id = "tool_1"
        mock_round1_response.content = [mock_tool_block]

        mock_client = Mock()
        mock_client.messages.create.return_value = mock_round1_response
        mock_anthropic.return_value = mock_client

        # Mock tool manager that raises error
        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.side_effect = Exception(
            "Database connection failed"
        )

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        tools = [{"name": "search_course_content"}]

        result = generator.generate_response(
            "Search for AI content",
            tools=tools,
            tool_manager=mock_tool_manager,
            max_rounds=2,
        )

        assert "Tool execution failed: Database connection failed" in result
        assert mock_client.messages.create.call_count == 1

    @patch("ai_generator.anthropic.Anthropic")
    def test_sequential_tool_calling_backward_compatibility(self, mock_anthropic):
        """Test that max_rounds=1 uses single-round behavior"""
        # Tool use response
        mock_tool_response = Mock()
        mock_tool_response.stop_reason = "tool_use"
        mock_tool_block = Mock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.name = "search_course_content"
        mock_tool_block.input = {"query": "test"}
        mock_tool_block.id = "tool_1"
        mock_tool_response.content = [mock_tool_block]

        # Final response
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Single round result.")]

        mock_client = Mock()
        mock_client.messages.create.side_effect = [
            mock_tool_response,
            mock_final_response,
        ]
        mock_anthropic.return_value = mock_client

        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.return_value = "Search result"

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        tools = [{"name": "search_course_content"}]

        result = generator.generate_response(
            "Search query", tools=tools, tool_manager=mock_tool_manager, max_rounds=1
        )

        assert result == "Single round result."
        assert mock_tool_manager.execute_tool.call_count == 1
        assert mock_client.messages.create.call_count == 2

    @patch("ai_generator.anthropic.Anthropic")
    def test_sequential_tool_calling_max_rounds_reached(self, mock_anthropic):
        """Test that final response is forced when max rounds reached"""
        # Round 1: tool use
        mock_round1_response = Mock()
        mock_round1_response.stop_reason = "tool_use"
        mock_tool_block1 = Mock()
        mock_tool_block1.type = "tool_use"
        mock_tool_block1.name = "search_course_content"
        mock_tool_block1.input = {"query": "first search"}
        mock_tool_block1.id = "tool_1"
        mock_round1_response.content = [mock_tool_block1]

        # Round 2: tool use (would continue, but max rounds reached)
        mock_round2_response = Mock()
        mock_round2_response.stop_reason = "tool_use"
        mock_tool_block2 = Mock()
        mock_tool_block2.type = "tool_use"
        mock_tool_block2.name = "search_course_content"
        mock_tool_block2.input = {"query": "second search"}
        mock_tool_block2.id = "tool_2"
        mock_round2_response.content = [mock_tool_block2]

        # Final response without tools
        mock_final_response = Mock()
        mock_final_response.content = [Mock(text="Final answer after max rounds.")]

        mock_client = Mock()
        mock_client.messages.create.side_effect = [
            mock_round1_response,
            mock_round2_response,
            mock_final_response,
        ]
        mock_anthropic.return_value = mock_client

        mock_tool_manager = Mock()
        mock_tool_manager.execute_tool.side_effect = ["Result 1", "Result 2"]

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        tools = [{"name": "search_course_content"}]

        result = generator.generate_response(
            "Complex query", tools=tools, tool_manager=mock_tool_manager, max_rounds=2
        )

        assert result == "Final answer after max rounds."
        assert mock_tool_manager.execute_tool.call_count == 2
        assert mock_client.messages.create.call_count == 3

    @patch("ai_generator.anthropic.Anthropic")
    def test_sequential_tool_calling_api_error(self, mock_anthropic):
        """Test handling of API errors during sequential rounds"""
        mock_client = Mock()
        mock_client.messages.create.side_effect = Exception("API rate limit exceeded")
        mock_anthropic.return_value = mock_client

        mock_tool_manager = Mock()

        generator = AIGenerator("test-api-key", "claude-sonnet-4-20250514")
        tools = [{"name": "search_course_content"}]

        result = generator.generate_response(
            "Search query", tools=tools, tool_manager=mock_tool_manager, max_rounds=2
        )

        assert "Error in round 1: API rate limit exceeded" in result

    def test_system_prompt_updated_for_sequential_calling(self):
        """Test that system prompt supports multi-round calling"""
        generator = AIGenerator("test-key", "claude-sonnet-4-20250514")

        # Should no longer contain the single search restriction
        assert "One search per query maximum" not in generator.SYSTEM_PROMPT

        # Should contain multi-round guidance
        assert "Multi-Step Search Protocol" in generator.SYSTEM_PROMPT
        assert "up to 2 tool calls" in generator.SYSTEM_PROMPT
        assert "separate rounds" in generator.SYSTEM_PROMPT
