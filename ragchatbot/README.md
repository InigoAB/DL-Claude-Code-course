# RAG Chatbot - Course Materials Search System

A Retrieval-Augmented Generation (RAG) system for course materials with a tool-based architecture where Claude AI can invoke search functions to retrieve relevant content.

## Architecture Overview

**Request Flow**: Frontend → FastAPI → RAGSystem → AIGenerator (Claude) → Tools → VectorStore → Response

The system uses a **tool-based approach** where Claude decides when to search course content rather than always performing retrieval.

## Key Features

- **Intelligent Search**: Claude AI automatically decides when to search course content based on user queries
- **Multi-format Support**: Processes `.txt`, `.pdf`, and `.docx` course transcripts
- **Semantic Search**: Uses ChromaDB with embeddings for intelligent content retrieval
- **Session Management**: Maintains conversation history for context continuity
- **Tool Integration**: Anthropic's tool calling feature for autonomous content search

## Quick Start

### Prerequisites
- Python 3.8+
- uv package manager
- Anthropic API key

### Setup

1. **Environment Setup**
   ```bash
   # Create .env file with your API key
   echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
   ```

2. **Install Dependencies**
   ```bash
   uv sync
   ```

3. **Add Course Materials**
   Place your course transcripts in the `docs/` folder:
   - Supports `.txt`, `.pdf`, `.docx` files
   - Files are automatically processed on startup

4. **Run the Application**
   ```bash
   # Quick start
   ./run.sh
   
   # Or manual start
   cd backend && uv run uvicorn app:app --reload --port 8000
   ```

5. **Access the Interface**
   Open http://localhost:8000 in your browser

## Development

### Code Quality
```bash
# Format code automatically
./scripts/format-code.sh

# Check code quality (formatting, imports, linting)
./scripts/quality-check.sh

# Individual tools
uv run black .          # Format code with Black
uv run isort .           # Sort imports
uv run flake8 .          # Run linting checks
```

### Testing
```bash
# Run tests
cd backend && uv run python -m pytest

# Run specific test file
cd backend && uv run python -m pytest tests/test_rag_system.py
```

## Architecture Details

### Core Components

**Backend (`backend/`):**
- `rag_system.py` - Main orchestrator coordinating all components
- `ai_generator.py` - Anthropic Claude integration with tool support
- `vector_store.py` - ChromaDB interface with semantic search
- `document_processor.py` - Processes course documents into chunks
- `search_tools.py` - Tool system for Claude to search content
- `session_manager.py` - Conversation history and session persistence
- `app.py` - FastAPI application with static file serving

**Frontend (`frontend/`):**
- Vanilla HTML/CSS/JavaScript chat interface
- Communicates via `/api/query` and `/api/courses` endpoints

### Data Flow

1. **Document Processing**: Raw files → DocumentProcessor → Course/Lesson/Chunk models → VectorStore
2. **Query Processing**: User query → RAGSystem → AIGenerator → CourseSearchTool (if needed) → Response
3. **Session Management**: Conversation history maintained for context continuity

### Configuration

All settings in `backend/config.py`:
- Anthropic model: `claude-sonnet-4-20250514`
- Embedding model: `all-MiniLM-L6-v2`
- Chunk size: 800 chars with 100 char overlap
- ChromaDB path: `./chroma_db`
- Max search results: 5, Max conversation history: 2

## File Structure

```
ragchatbot/
├── backend/
│   ├── chroma_db/          # ChromaDB vector database
│   ├── tests/              # Test suite
│   ├── rag_system.py       # Main orchestrator
│   ├── ai_generator.py     # Claude AI integration
│   ├── vector_store.py     # Vector database interface
│   ├── document_processor.py # Document processing
│   ├── search_tools.py     # Search tool system
│   ├── session_manager.py  # Session management
│   ├── app.py             # FastAPI application
│   ├── config.py          # Configuration settings
│   └── models.py          # Data models
├── frontend/
│   ├── index.html         # Main interface
│   ├── script.js          # Frontend logic
│   └── style.css          # Styling
├── docs/                  # Course transcripts (auto-processed)
├── scripts/               # Development scripts
├── run.sh                 # Quick start script
├── pyproject.toml         # Python dependencies
└── README.md             # This file
```

## API Endpoints

- `GET /` - Serve frontend interface
- `POST /api/query` - Process user queries
- `GET /api/courses` - List available courses
- `DELETE /api/sessions/{session_id}` - Clear session history

## Contributing

1. Follow the code quality standards using the provided scripts
2. Add tests for new functionality
3. Update documentation as needed
4. Use `uv` for all Python package management