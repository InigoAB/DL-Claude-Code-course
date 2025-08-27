# Figma MCP Setup Instructions

This directory contains a local Figma MCP (Model Context Protocol) server setup for project-specific use.

## Setup Instructions

### 1. Install Dependencies
Dependencies are already installed locally in this project:
```bash
npm install  # (already done)
```

### 2. Configure API Key

You need to set your Figma API key as an environment variable:

```bash
export FIGMA_API_KEY="your_figma_api_key_here"
```

Or create a `.env` file in this directory:
```
FIGMA_API_KEY=your_figma_api_key_here
```

### 3. Test MCP Connection

Run the test script to verify the setup:
```bash
node test-figma-mcp.js
```

### 4. Claude Code Integration

The MCP server is configured in `.claude/claude_desktop_config.json` (excluded from git for security).

## Files

- `test-figma-mcp.js` - Test script for MCP connection
- `figma-key-indicators.fig` - Figma design file for implementation
- `package.json` - Local dependencies including figma-developer-mcp

## Security

- API keys are protected via environment variables
- Configuration files with credentials are gitignored
- Local installation keeps dependencies project-specific

## Usage

Once configured, you can use Figma MCP tools within Claude Code to:
- Access Figma design data
- Extract component information
- Generate code from Figma designs
- Analyze design systems