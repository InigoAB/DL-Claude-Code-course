# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This repository contains three main applications:

- **`ragchatbot/`** - RAG (Retrieval-Augmented Generation) system for course materials
- **`data_analysis/`** - Streamlit dashboard for e-commerce data analysis  
- **`fred-data/`** - Next.js dashboard for FRED economic indicators

## Unified Project Setup

This repository uses a **unified uv project** with a single virtual environment and dependency management for all Python applications.

### Environment Setup
Create `.env` file in repository root with:
```
ANTHROPIC_API_KEY=your_api_key_here
```

### Package Management
```bash
# Install/sync dependencies (run from repository root)
uv sync

# Add new dependency (affects all projects)
uv add package-name

# Run Python commands
uv run python script.py
```

## RAG Chatbot Commands

### Running the Application
```bash
# Quick start (recommended)
cd ragchatbot && ./run.sh

# Manual start
cd ragchatbot/backend && uv run uvicorn app:app --reload --port 8000
```

### Code Quality
```bash
# Format code automatically (run from repository root)
uv run black ragchatbot/

# Check code quality 
cd ragchatbot && ./scripts/quality-check.sh

# Individual tools (from repository root)
uv run black ragchatbot/          # Format ragchatbot code
uv run isort ragchatbot/          # Sort imports
uv run flake8 ragchatbot/         # Run linting checks
```

## Data Analysis Commands

### Running Streamlit Dashboard
```bash
# From repository root
uv run streamlit run data_analysis/dashboard.py
```

### Running Jupyter Notebooks
```bash
# From repository root
uv run jupyter notebook data_analysis/
```

## Architecture Overview

This is a **RAG (Retrieval-Augmented Generation) system** for course materials with a tool-based architecture where Claude AI can invoke search functions to retrieve relevant content.

### Core Architecture Pattern

**Request Flow**: Frontend → FastAPI → RAGSystem → AIGenerator (Claude) → Tools → VectorStore → Response

The system uses a **tool-based approach** where Claude decides when to search course content rather than always performing retrieval.

### Key Components

**Backend (`ragchatbot/backend/`):**
- `rag_system.py` - **Main orchestrator** that coordinates all components and handles the query lifecycle
- `ai_generator.py` - Anthropic Claude integration with tool support and system prompting
- `vector_store.py` - ChromaDB interface with semantic search capabilities  
- `document_processor.py` - Processes course documents into structured chunks
- `search_tools.py` - Tool system allowing Claude to search course content when needed
- `session_manager.py` - Conversation history and session persistence
- `app.py` - FastAPI application with static file serving for frontend

**Frontend (`ragchatbot/frontend/`):**
- Vanilla HTML/CSS/JavaScript chat interface
- Communicates via `/api/query` and `/api/courses` endpoints

### Data Flow Patterns

**Document Processing**: Raw text files → DocumentProcessor → Course/Lesson/CourseChunk models → VectorStore (ChromaDB)

**Query Processing**: User query → RAGSystem → AIGenerator (with tools) → CourseSearchTool (if needed) → VectorStore → Response with sources

**Session Management**: Each conversation maintains history through SessionManager for context continuity

### Configuration (`ragchatbot/backend/config.py`)

All settings centralized in Config dataclass:
- Anthropic model: `claude-sonnet-4-20250514`
- Embedding model: `all-MiniLM-L6-v2`  
- Chunk size: 800 chars with 100 char overlap
- ChromaDB path: `./chroma_db`
- Max search results: 5, Max conversation history: 2

### Data Models (`ragchatbot/backend/models.py`)

**Hierarchical structure**: Course → Lesson → CourseChunk
- Course: title (unique ID), instructor, lessons, course_link
- Lesson: lesson_number, title, lesson_link  
- CourseChunk: content, course_title, lesson_number, chunk_index

### Tool System

The application uses Anthropic's tool calling feature:
- `CourseSearchTool` performs semantic search in ChromaDB
- `ToolManager` registers tools and tracks search sources
- Claude autonomously decides when to invoke tools based on query content

### Document Storage

Course transcripts in `ragchatbot/docs/` folder are automatically loaded on startup:
- Supports `.txt`, `.pdf`, `.docx` files
- Processed into chunks and stored in ChromaDB with embeddings
- Metadata includes course title, lesson numbers, and source attribution

### Development Notes

- Test framework configured with pytest
- Uses `uv` for Python package management
- Frontend served as static files from FastAPI
- Development mode includes no-cache headers and auto-reload
- Sessions are in-memory only (not persisted to disk)
- ChromaDB data persists in `ragchatbot/backend/chroma_db/` directory
- Code quality tools configured: Black (formatting), isort (import sorting), flake8 (linting)
- always use uv to run the server do not use pip directly
- make sure to use uv to manage all dependencies
- use uv to run python files or add any dependencies
- run `uv run black ragchatbot/ data_analysis/` and `cd ragchatbot && ./scripts/quality-check.sh` before committing code
- use unified uv environment: run all Python commands with `uv run` from repository root