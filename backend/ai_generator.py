from typing import Any, Dict, List, Optional

import anthropic


class AIGenerator:
    """Handles interactions with Anthropic's Claude API for generating responses"""

    # Static system prompt to avoid rebuilding on each call
    SYSTEM_PROMPT = """ You are an AI assistant specialized in course materials and educational content with access to comprehensive search tools for course information.

Search Tool Usage:
- **Content Search Tool**: Use for questions about specific course content or detailed educational materials
- **Course Outline Tool**: Use for questions about course structure, lesson lists, or course overviews
- **Multi-Step Search Protocol**: You can make up to 2 tool calls in separate rounds to fully answer complex questions
- Use additional searches when initial results don't provide complete information
- Examples requiring multiple searches:
  * Comparing content across different courses/lessons
  * Multi-part questions requiring different search strategies
  * When initial search reveals need for more specific follow-up search
- Always synthesize information from all searches in your final response
- If first search answers the question completely, provide final response without additional tools
- Synthesize search results into accurate, fact-based responses
- If search yields no results, state this clearly without offering alternatives

Response Protocol:
- **General knowledge questions**: Answer using existing knowledge without searching
- **Course-specific content questions**: Use content search tool first, then answer
- **Course outline/structure questions**: Use outline tool to get complete course information including title, course link, and all lessons
- **No meta-commentary**:
 - Provide direct answers only — no reasoning process, search explanations, or question-type analysis
 - Do not mention "based on the search results"

For course outline queries, always include:
- Course title
- Course link 
- Complete numbered lesson list with titles

All responses must be:
1. **Brief, Concise and focused** - Get to the point quickly
2. **Educational** - Maintain instructional value
3. **Clear** - Use accessible language
4. **Example-supported** - Include relevant examples when they aid understanding
Provide only the direct answer to what was asked.
"""

    def __init__(self, api_key: str, model: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

        # Pre-build base API parameters
        self.base_params = {"model": self.model, "temperature": 0, "max_tokens": 800}

    def generate_response(
        self,
        query: str,
        conversation_history: Optional[str] = None,
        tools: Optional[List] = None,
        tool_manager=None,
        max_rounds: int = 2,
    ) -> str:
        """
        Generate AI response with optional tool usage and conversation context.

        Args:
            query: The user's question or request
            conversation_history: Previous messages for context
            tools: Available tools the AI can use
            tool_manager: Manager to execute tools
            max_rounds: Maximum number of sequential tool calling rounds (default: 2)

        Returns:
            Generated response as string
        """

        # Build system content efficiently - avoid string ops when possible
        system_content = (
            f"{self.SYSTEM_PROMPT}\n\nPrevious conversation:\n{conversation_history}"
            if conversation_history
            else self.SYSTEM_PROMPT
        )

        # Use sequential rounds if tools are available and max_rounds > 1
        if tools and tool_manager and max_rounds > 1:
            return self._execute_sequential_rounds(
                query, system_content, tools, tool_manager, max_rounds
            )

        # Fall back to single-round behavior for backward compatibility
        return self._execute_single_round(query, system_content, tools, tool_manager)

    def _execute_single_round(
        self, query: str, system_content: str, tools: Optional[List], tool_manager
    ) -> str:
        """
        Execute single-round tool calling (original behavior for backward compatibility).

        Args:
            query: The user's question
            system_content: System prompt with context
            tools: Available tools
            tool_manager: Manager to execute tools

        Returns:
            Generated response as string
        """
        # Prepare API call parameters efficiently
        api_params = {
            **self.base_params,
            "messages": [{"role": "user", "content": query}],
            "system": system_content,
        }

        # Add tools if available
        if tools:
            api_params["tools"] = tools
            api_params["tool_choice"] = {"type": "auto"}

        # Get response from Claude
        response = self.client.messages.create(**api_params)

        # Handle tool execution if needed
        if response.stop_reason == "tool_use" and tool_manager:
            return self._handle_tool_execution(response, api_params, tool_manager)

        # Return direct response
        return response.content[0].text

    def _execute_sequential_rounds(
        self,
        query: str,
        system_content: str,
        tools: List,
        tool_manager,
        max_rounds: int,
    ) -> str:
        """
        Execute up to max_rounds of sequential tool calling with Claude.

        Args:
            query: The user's question
            system_content: System prompt with context
            tools: Available tools
            tool_manager: Manager to execute tools
            max_rounds: Maximum number of rounds to execute

        Returns:
            Final response text
        """
        # Initialize message history with user query
        messages = [{"role": "user", "content": query}]

        for round_number in range(1, max_rounds + 1):
            try:
                # Prepare API call parameters
                api_params = {
                    **self.base_params,
                    "messages": messages,
                    "system": system_content,
                    "tools": tools,
                    "tool_choice": {"type": "auto"},
                }

                # Get response from Claude
                response = self.client.messages.create(**api_params)

                # Check if Claude wants to use tools
                if response.stop_reason != "tool_use":
                    # Claude provided direct response without tools - natural termination
                    return response.content[0].text

                # Add Claude's response with tool calls to message history
                messages.append({"role": "assistant", "content": response.content})

                # Execute all tool calls and collect results
                tool_results = []
                for content_block in response.content:
                    if content_block.type == "tool_use":
                        try:
                            tool_result = tool_manager.execute_tool(
                                content_block.name, **content_block.input
                            )

                            tool_results.append(
                                {
                                    "type": "tool_result",
                                    "tool_use_id": content_block.id,
                                    "content": tool_result,
                                }
                            )
                        except Exception as e:
                            # Tool execution error - graceful termination
                            return f"Tool execution failed: {str(e)}"

                # Add tool results as user message
                if tool_results:
                    messages.append({"role": "user", "content": tool_results})

                # If this is the last round, get final response without tools
                if round_number >= max_rounds:
                    final_params = {
                        **self.base_params,
                        "messages": messages,
                        "system": system_content,
                    }
                    final_response = self.client.messages.create(**final_params)
                    return final_response.content[0].text

            except Exception as e:
                # API error - return error message
                return f"Error in round {round_number}: {str(e)}"

        # Should not reach here, but fallback just in case
        return "Maximum rounds completed without final response."

    def _handle_tool_execution(
        self, initial_response, base_params: Dict[str, Any], tool_manager
    ):
        """
        Handle execution of tool calls and get follow-up response.

        Args:
            initial_response: The response containing tool use requests
            base_params: Base API parameters
            tool_manager: Manager to execute tools

        Returns:
            Final response text after tool execution
        """
        # Start with existing messages
        messages = base_params["messages"].copy()

        # Add AI's tool use response
        messages.append({"role": "assistant", "content": initial_response.content})

        # Execute all tool calls and collect results
        tool_results = []
        for content_block in initial_response.content:
            if content_block.type == "tool_use":
                tool_result = tool_manager.execute_tool(
                    content_block.name, **content_block.input
                )

                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": content_block.id,
                        "content": tool_result,
                    }
                )

        # Add tool results as single message
        if tool_results:
            messages.append({"role": "user", "content": tool_results})

        # Prepare final API call without tools
        final_params = {
            **self.base_params,
            "messages": messages,
            "system": base_params["system"],
        }

        # Get final response
        final_response = self.client.messages.create(**final_params)
        return final_response.content[0].text
