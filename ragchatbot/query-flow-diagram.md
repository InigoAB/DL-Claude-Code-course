# Query Handling Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  User Input → sendMessage() → Disable UI → Add User Message → Show Loading     │
│                     │                                                           │
│                     ▼                                                           │
│              POST /api/query                                                    │
│              {                                                                  │
│                query: "user question",                                         │
│                session_id: "abc123"                                            │
│              }                                                                  │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FASTAPI APP                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  @app.post("/api/query") → Validate QueryRequest → Create/Use Session          │
│                                   │                                             │
│                                   ▼                                             │
│                        rag_system.query(query, session_id)                     │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RAG SYSTEM                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. Get conversation history from SessionManager                               │
│                              │                                                 │
│                              ▼                                                 │
│  2. ai_generator.generate_response(                                            │
│       query, history, tools, tool_manager                                     │
│     )                        │                                                 │
│                              ▼                                                 │
│  3. Get sources from ToolManager                                              │
│                              │                                                 │
│                              ▼                                                 │
│  4. Update conversation history                                                │
│                              │                                                 │
│                              ▼                                                 │
│  5. Return (response, sources)                                                 │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            AI GENERATOR                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Claude API Call with:                                                         │
│  • System prompt (educational assistant)                                       │
│  • User query + conversation history                                           │
│  • Available tools (CourseSearchTool)                                         │
│                              │                                                 │
│                              ▼                                                 │
│  Claude decides whether to use search tool                                     │
│                              │                                                 │
│                              ▼                                                 │
│  If needed: CourseSearchTool.search() ──────────────────────┐                  │
│                              │                              │                  │
│                              ▼                              ▼                  │
│  Generate final response                          ┌─────────────────────────┐   │
└─────────────────────────────┬──────────────────────│    VECTOR STORE         │   │
                              │                      │  (ChromaDB)             │   │
                              │                      │                         │   │
                              │                      │ • Semantic search       │   │
                              │                      │ • Retrieve course       │   │
                              │                      │   chunks                │   │
                              │                      │ • Return sources        │   │
                              │                      └─────────────────────────┘   │
                              ▼                                                     │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RESPONSE                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  QueryResponse {                                                               │
│    answer: "AI generated response",                                            │
│    sources: ["course1_script.txt:123", "course2_script.txt:456"],            │
│    session_id: "abc123"                                                       │
│  }                                                                             │
│                              │                                                 │
│                              ▼                                                 │
│  JSON Response to Frontend                                                     │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND DISPLAY                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  • Parse JSON response                                                         │
│  • Update session_id if new                                                   │
│  • Remove loading message                                                     │
│  • Display AI response + sources                                              │
│  • Re-enable UI inputs                                                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

Key Components:
═══════════════

SessionManager: Maintains conversation history per session
ToolManager: Manages available search tools and source tracking  
CourseSearchTool: Performs semantic search in ChromaDB
VectorStore: ChromaDB interface for course content retrieval
DocumentProcessor: Chunks course documents for vector storage
```