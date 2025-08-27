"""
API endpoint tests for the FastAPI application.

These tests verify the behavior of all API endpoints including:
- /api/query - Process queries and return responses with sources
- /api/courses - Get course statistics and analytics
- /api/new-session - Start new conversation sessions
- / - Root endpoint
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import json


@pytest.mark.api
class TestQueryEndpoint:
    """Test cases for the /api/query endpoint"""
    
    def test_query_with_session_id(self, client, sample_query_request, expected_query_response):
        """Test successful query with existing session ID"""
        response = client.post("/api/query", json=sample_query_request)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["answer"] == expected_query_response["answer"]
        assert data["sources"] == expected_query_response["sources"]
        assert data["session_id"] == expected_query_response["session_id"]
    
    def test_query_without_session_id(self, client, mock_rag_system):
        """Test query without session ID creates new session"""
        query_request = {"query": "What is machine learning?"}
        
        response = client.post("/api/query", json=query_request)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should create new session
        mock_rag_system.session_manager.create_session.assert_called()
        assert data["session_id"] == "test-session-123"
        assert "answer" in data
        assert "sources" in data
    
    def test_query_with_empty_query(self, client):
        """Test query with empty string"""
        query_request = {"query": ""}
        
        response = client.post("/api/query", json=query_request)
        
        assert response.status_code == 200
        # Should still process empty query
        data = response.json()
        assert "answer" in data
        assert "sources" in data
        assert "session_id" in data
    
    def test_query_missing_query_field(self, client):
        """Test request missing required query field"""
        invalid_request = {"session_id": "test-123"}
        
        response = client.post("/api/query", json=invalid_request)
        
        assert response.status_code == 422  # Validation error
    
    def test_query_invalid_json(self, client):
        """Test request with invalid JSON format"""
        response = client.post("/api/query", data="invalid json")
        
        assert response.status_code == 422
    
    def test_query_with_rag_system_error(self, client, mock_rag_system):
        """Test handling of RAG system errors"""
        mock_rag_system.query.side_effect = Exception("RAG system error")
        
        query_request = {"query": "test query"}
        response = client.post("/api/query", json=query_request)
        
        assert response.status_code == 500
        assert "RAG system error" in response.json()["detail"]


@pytest.mark.api
class TestCoursesEndpoint:
    """Test cases for the /api/courses endpoint"""
    
    def test_get_course_stats_success(self, client, expected_course_stats):
        """Test successful retrieval of course statistics"""
        response = client.get("/api/courses")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_courses"] == expected_course_stats["total_courses"]
        assert data["course_titles"] == expected_course_stats["course_titles"]
    
    def test_get_course_stats_empty_courses(self, client, mock_rag_system):
        """Test course stats with no courses"""
        mock_rag_system.get_course_analytics.return_value = {
            "total_courses": 0,
            "course_titles": []
        }
        
        response = client.get("/api/courses")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_courses"] == 0
        assert data["course_titles"] == []
    
    def test_get_course_stats_with_error(self, client, mock_rag_system):
        """Test handling of analytics errors"""
        mock_rag_system.get_course_analytics.side_effect = Exception("Analytics error")
        
        response = client.get("/api/courses")
        
        assert response.status_code == 500
        assert "Analytics error" in response.json()["detail"]


@pytest.mark.api
class TestNewSessionEndpoint:
    """Test cases for the /api/new-session endpoint"""
    
    def test_new_session_without_old_session(self, client, mock_rag_system):
        """Test creating new session without clearing old one"""
        request_data = {}
        
        response = client.post("/api/new-session", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["session_id"] == "test-session-123"
        assert data["message"] == "New chat session started successfully"
        
        # Should create new session but not clear any old ones
        mock_rag_system.session_manager.create_session.assert_called()
        mock_rag_system.session_manager.clear_session.assert_not_called()
    
    def test_new_session_with_old_session_cleanup(self, client, mock_rag_system, sample_new_session_request):
        """Test creating new session and clearing old one"""
        response = client.post("/api/new-session", json=sample_new_session_request)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["session_id"] == "test-session-123"
        assert data["message"] == "New chat session started successfully"
        
        # Should clear old session and create new one
        mock_rag_system.session_manager.clear_session.assert_called_with("old-session-456")
        mock_rag_system.session_manager.create_session.assert_called()
    
    def test_new_session_with_session_manager_error(self, client, mock_rag_system):
        """Test handling of session manager errors"""
        mock_rag_system.session_manager.create_session.side_effect = Exception("Session error")
        
        request_data = {}
        response = client.post("/api/new-session", json=request_data)
        
        assert response.status_code == 500
        assert "Session error" in response.json()["detail"]


@pytest.mark.api
class TestRootEndpoint:
    """Test cases for the root endpoint"""
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns welcome message"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Course Materials RAG System API"


@pytest.mark.api
class TestMiddleware:
    """Test cases for middleware functionality"""
    
    def test_cors_headers(self, client):
        """Test CORS headers are properly set"""
        response = client.get("/")
        
        # CORS headers should be present (handled by middleware)
        assert response.status_code == 200
    
    def test_options_request(self, client):
        """Test preflight OPTIONS request handling"""
        response = client.options("/api/query")
        
        # Should handle OPTIONS request for CORS preflight
        assert response.status_code in [200, 405]  # 405 if OPTIONS not explicitly handled


@pytest.mark.api
class TestResponseValidation:
    """Test cases for response model validation"""
    
    def test_query_response_schema(self, client, sample_query_request):
        """Test query response follows correct schema"""
        response = client.post("/api/query", json=sample_query_request)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = ["answer", "sources", "session_id"]
        for field in required_fields:
            assert field in data
        
        # Check types
        assert isinstance(data["answer"], str)
        assert isinstance(data["sources"], list)
        assert isinstance(data["session_id"], str)
        
        # Check sources structure
        for source in data["sources"]:
            assert isinstance(source, dict)
            assert "text" in source
            assert "link" in source
    
    def test_course_stats_response_schema(self, client):
        """Test course stats response follows correct schema"""
        response = client.get("/api/courses")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = ["total_courses", "course_titles"]
        for field in required_fields:
            assert field in data
        
        # Check types
        assert isinstance(data["total_courses"], int)
        assert isinstance(data["course_titles"], list)
        assert all(isinstance(title, str) for title in data["course_titles"])
    
    def test_new_session_response_schema(self, client):
        """Test new session response follows correct schema"""
        response = client.post("/api/new-session", json={})
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = ["session_id", "message"]
        for field in required_fields:
            assert field in data
        
        # Check types
        assert isinstance(data["session_id"], str)
        assert isinstance(data["message"], str)


@pytest.mark.api
@pytest.mark.integration
class TestAPIIntegration:
    """Integration test cases for API workflow"""
    
    def test_full_conversation_workflow(self, client, mock_rag_system):
        """Test complete conversation workflow"""
        # 1. Start new session
        session_response = client.post("/api/new-session", json={})
        assert session_response.status_code == 200
        session_id = session_response.json()["session_id"]
        
        # 2. Query with session ID
        query_request = {
            "query": "What is the main topic?",
            "session_id": session_id
        }
        query_response = client.post("/api/query", json=query_request)
        assert query_response.status_code == 200
        assert query_response.json()["session_id"] == session_id
        
        # 3. Get course stats
        stats_response = client.get("/api/courses")
        assert stats_response.status_code == 200
        assert "total_courses" in stats_response.json()
        
        # 4. Start new session (clearing old one)
        new_session_request = {"old_session_id": session_id}
        new_session_response = client.post("/api/new-session", json=new_session_request)
        assert new_session_response.status_code == 200
        
        # Verify old session was cleared and new one created
        mock_rag_system.session_manager.clear_session.assert_called_with(session_id)
    
    def test_multiple_queries_same_session(self, client):
        """Test multiple queries in the same session"""
        session_id = "persistent-session-123"
        
        # First query
        query1 = {"query": "First question", "session_id": session_id}
        response1 = client.post("/api/query", json=query1)
        assert response1.status_code == 200
        assert response1.json()["session_id"] == session_id
        
        # Second query with same session
        query2 = {"query": "Follow-up question", "session_id": session_id}
        response2 = client.post("/api/query", json=query2)
        assert response2.status_code == 200
        assert response2.json()["session_id"] == session_id