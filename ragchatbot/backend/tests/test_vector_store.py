import os
import shutil
import sys
import tempfile
from unittest.mock import MagicMock, Mock, patch

import pytest

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Course, CourseChunk, Lesson
from vector_store import SearchResults, VectorStore


class TestSearchResults:
    """Test suite for SearchResults dataclass"""

    def test_from_chroma_with_results(self):
        """Test creating SearchResults from ChromaDB results"""
        chroma_results = {
            "documents": [["doc1", "doc2"]],
            "metadatas": [[{"course": "test1"}, {"course": "test2"}]],
            "distances": [[0.1, 0.2]],
        }

        results = SearchResults.from_chroma(chroma_results)

        assert results.documents == ["doc1", "doc2"]
        assert results.metadata == [{"course": "test1"}, {"course": "test2"}]
        assert results.distances == [0.1, 0.2]
        assert results.error is None

    def test_from_chroma_empty_results(self):
        """Test creating SearchResults from empty ChromaDB results"""
        chroma_results = {"documents": [], "metadatas": [], "distances": []}

        results = SearchResults.from_chroma(chroma_results)

        assert results.documents == []
        assert results.metadata == []
        assert results.distances == []
        assert results.error is None

    def test_empty_with_error(self):
        """Test creating empty SearchResults with error message"""
        results = SearchResults.empty("Connection failed")

        assert results.documents == []
        assert results.metadata == []
        assert results.distances == []
        assert results.error == "Connection failed"

    def test_is_empty_true(self):
        """Test is_empty returns True for empty results"""
        results = SearchResults(documents=[], metadata=[], distances=[])
        assert results.is_empty() is True

    def test_is_empty_false(self):
        """Test is_empty returns False for non-empty results"""
        results = SearchResults(
            documents=["doc1"], metadata=[{"test": "meta"}], distances=[0.1]
        )
        assert results.is_empty() is False


class TestVectorStore:
    """Test suite for VectorStore"""

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_init_creates_collections(self, mock_embedding_func, mock_client_class):
        """Test VectorStore initialization creates required collections"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        # Mock collections
        mock_catalog = Mock()
        mock_content = Mock()
        mock_client.get_or_create_collection.side_effect = [mock_catalog, mock_content]

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2", max_results=5)

        assert store.max_results == 5
        assert mock_client.get_or_create_collection.call_count == 2

        # Verify collections were created with correct names
        calls = mock_client.get_or_create_collection.call_args_list
        collection_names = [call[1]["name"] for call in calls]
        assert "course_catalog" in collection_names
        assert "course_content" in collection_names

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_search_without_filters(self, mock_embedding_func, mock_client_class):
        """Test search without course or lesson filters"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        # Mock content collection
        mock_content = Mock()
        mock_content.query.return_value = {
            "documents": [["Sample content"]],
            "metadatas": [[{"course_title": "Test Course"}]],
            "distances": [[0.1]],
        }
        mock_client.get_or_create_collection.return_value = mock_content

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_content = mock_content

        results = store.search("test query")

        mock_content.query.assert_called_once_with(
            query_texts=["test query"], n_results=5, where=None
        )

        assert len(results.documents) == 1
        assert results.documents[0] == "Sample content"

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_search_with_course_filter(self, mock_client_class):
        """Test search with course name filter"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        # Mock catalog for course resolution
        mock_catalog = Mock()
        mock_catalog.query.return_value = {
            "documents": [["Test Course"]],
            "metadatas": [[{"title": "Test Course"}]],
        }

        # Mock content collection
        mock_content = Mock()
        mock_content.query.return_value = {
            "documents": [["Course content"]],
            "metadatas": [[{"course_title": "Test Course"}]],
            "distances": [[0.1]],
        }

        mock_client.get_or_create_collection.side_effect = [mock_catalog, mock_content]

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_catalog = mock_catalog
        store.course_content = mock_content

        results = store.search("test query", course_name="Test Course")

        # Verify course resolution was attempted
        mock_catalog.query.assert_called_once()

        # Verify content search with course filter
        mock_content.query.assert_called_once_with(
            query_texts=["test query"],
            n_results=5,
            where={"course_title": "Test Course"},
        )

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_search_with_lesson_filter(self, mock_client_class):
        """Test search with lesson number filter"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_content = Mock()
        mock_content.query.return_value = {
            "documents": [["Lesson content"]],
            "metadatas": [[{"course_title": "Test Course", "lesson_number": 1}]],
            "distances": [[0.1]],
        }

        mock_client.get_or_create_collection.return_value = mock_content

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_content = mock_content

        results = store.search("test query", lesson_number=1)

        mock_content.query.assert_called_once_with(
            query_texts=["test query"], n_results=5, where={"lesson_number": 1}
        )

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_search_with_both_filters(self, mock_client_class):
        """Test search with both course and lesson filters"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        # Mock course resolution
        mock_catalog = Mock()
        mock_catalog.query.return_value = {
            "documents": [["Test Course"]],
            "metadatas": [[{"title": "Test Course"}]],
        }

        mock_content = Mock()
        mock_content.query.return_value = {
            "documents": [["Specific content"]],
            "metadatas": [[{"course_title": "Test Course", "lesson_number": 2}]],
            "distances": [[0.1]],
        }

        mock_client.get_or_create_collection.side_effect = [mock_catalog, mock_content]

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_catalog = mock_catalog
        store.course_content = mock_content

        results = store.search("test query", course_name="Test Course", lesson_number=2)

        # Verify AND filter was used
        expected_filter = {
            "$and": [{"course_title": "Test Course"}, {"lesson_number": 2}]
        }

        mock_content.query.assert_called_once_with(
            query_texts=["test query"], n_results=5, where=expected_filter
        )

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_search_course_not_found(self, mock_client_class):
        """Test search when course name doesn't match any existing course"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        # Mock empty course resolution
        mock_catalog = Mock()
        mock_catalog.query.return_value = {"documents": [[]], "metadatas": [[]]}

        mock_client.get_or_create_collection.return_value = mock_catalog

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_catalog = mock_catalog

        results = store.search("test query", course_name="Nonexistent Course")

        assert results.error == "No course found matching 'Nonexistent Course'"
        assert results.is_empty()

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_search_chromadb_error(self, mock_client_class):
        """Test search when ChromaDB raises an exception"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_content = Mock()
        mock_content.query.side_effect = Exception("ChromaDB connection failed")

        mock_client.get_or_create_collection.return_value = mock_content

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_content = mock_content

        results = store.search("test query")

        assert "Search error:" in results.error
        assert "ChromaDB connection failed" in results.error

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_add_course_metadata(self, mock_client_class, sample_course):
        """Test adding course metadata to vector store"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_catalog = Mock()
        mock_client.get_or_create_collection.return_value = mock_catalog

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_catalog = mock_catalog

        store.add_course_metadata(sample_course)

        # Verify course was added to catalog
        mock_catalog.add.assert_called_once()
        call_args = mock_catalog.add.call_args

        assert call_args[1]["documents"] == ["Sample Course"]
        assert call_args[1]["ids"] == ["Sample Course"]

        metadata = call_args[1]["metadatas"][0]
        assert metadata["title"] == "Sample Course"
        assert metadata["instructor"] == "Test Instructor"
        assert "lessons_json" in metadata

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_add_course_content(self, mock_client_class, sample_course_chunks):
        """Test adding course content chunks to vector store"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_content = Mock()
        mock_client.get_or_create_collection.return_value = mock_content

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_content = mock_content

        store.add_course_content(sample_course_chunks)

        # Verify chunks were added
        mock_content.add.assert_called_once()
        call_args = mock_content.add.call_args

        assert len(call_args[1]["documents"]) == 3
        assert len(call_args[1]["metadatas"]) == 3
        assert len(call_args[1]["ids"]) == 3

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_add_course_content_empty_list(self, mock_client_class):
        """Test adding empty course content list"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_content = Mock()
        mock_client.get_or_create_collection.return_value = mock_content

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_content = mock_content

        store.add_course_content([])

        # Should not call add when list is empty
        mock_content.add.assert_not_called()

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_clear_all_data(self, mock_client_class):
        """Test clearing all data from collections"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        # Mock successful deletion and recreation
        mock_catalog = Mock()
        mock_content = Mock()
        mock_client.get_or_create_collection.side_effect = [mock_catalog, mock_content]

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")

        store.clear_all_data()

        # Verify collections were deleted
        assert mock_client.delete_collection.call_count == 2

        # Verify collections were recreated
        assert (
            mock_client.get_or_create_collection.call_count >= 4
        )  # Initial + recreation

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_get_existing_course_titles(self, mock_client_class):
        """Test getting existing course titles"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_catalog = Mock()
        mock_catalog.get.return_value = {"ids": ["Course 1", "Course 2", "Course 3"]}

        mock_client.get_or_create_collection.return_value = mock_catalog

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_catalog = mock_catalog

        titles = store.get_existing_course_titles()

        assert titles == ["Course 1", "Course 2", "Course 3"]

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_get_existing_course_titles_empty(self, mock_client_class):
        """Test getting course titles when catalog is empty"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_catalog = Mock()
        mock_catalog.get.return_value = {"ids": None}

        mock_client.get_or_create_collection.return_value = mock_catalog

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_catalog = mock_catalog

        titles = store.get_existing_course_titles()

        assert titles == []

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_get_course_count(self, mock_client_class):
        """Test getting course count"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_catalog = Mock()
        mock_catalog.get.return_value = {"ids": ["Course 1", "Course 2"]}

        mock_client.get_or_create_collection.return_value = mock_catalog

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_catalog = mock_catalog

        count = store.get_course_count()

        assert count == 2

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_get_all_courses_metadata(self, mock_client_class):
        """Test getting all courses metadata"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_catalog = Mock()
        mock_catalog.get.return_value = {
            "metadatas": [
                {
                    "title": "Course 1",
                    "instructor": "Instructor 1",
                    "lessons_json": '[{"lesson_number": 1, "lesson_title": "Lesson 1"}]',
                },
                {
                    "title": "Course 2",
                    "instructor": "Instructor 2",
                    "lessons_json": '[{"lesson_number": 1, "lesson_title": "Intro"}]',
                },
            ]
        }

        mock_client.get_or_create_collection.return_value = mock_catalog

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_catalog = mock_catalog

        metadata = store.get_all_courses_metadata()

        assert len(metadata) == 2
        assert metadata[0]["title"] == "Course 1"
        assert "lessons" in metadata[0]
        assert metadata[0]["lessons"][0]["lesson_number"] == 1

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_get_lesson_link(self, mock_client_class):
        """Test getting lesson link for specific course and lesson"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_catalog = Mock()
        mock_catalog.get.return_value = {
            "metadatas": [
                {
                    "lessons_json": '[{"lesson_number": 1, "lesson_title": "Intro", "lesson_link": "https://example.com/lesson1"}]'
                }
            ]
        }

        mock_client.get_or_create_collection.return_value = mock_catalog

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_catalog = mock_catalog

        link = store.get_lesson_link("Test Course", 1)

        assert link == "https://example.com/lesson1"
        mock_catalog.get.assert_called_once_with(ids=["Test Course"])

    @patch("vector_store.chromadb.PersistentClient")
    @patch(
        "vector_store.chromadb.utils.embedding_functions.SentenceTransformerEmbeddingFunction"
    )
    def test_get_lesson_link_not_found(self, mock_client_class):
        """Test getting lesson link when lesson doesn't exist"""
        mock_client = Mock()
        mock_client_class.return_value = mock_client

        mock_catalog = Mock()
        mock_catalog.get.return_value = {
            "metadatas": [
                {
                    "lessons_json": '[{"lesson_number": 1, "lesson_title": "Intro", "lesson_link": "https://example.com/lesson1"}]'
                }
            ]
        }

        mock_client.get_or_create_collection.return_value = mock_catalog

        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        store.course_catalog = mock_catalog

        # Request lesson 2 when only lesson 1 exists
        link = store.get_lesson_link("Test Course", 2)

        assert link is None

    def test_build_filter_no_filters(self):
        """Test filter building with no filters"""
        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        filter_dict = store._build_filter(None, None)
        assert filter_dict is None

    def test_build_filter_course_only(self):
        """Test filter building with course filter only"""
        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        filter_dict = store._build_filter("Test Course", None)
        assert filter_dict == {"course_title": "Test Course"}

    def test_build_filter_lesson_only(self):
        """Test filter building with lesson filter only"""
        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        filter_dict = store._build_filter(None, 1)
        assert filter_dict == {"lesson_number": 1}

    def test_build_filter_both_filters(self):
        """Test filter building with both filters"""
        # Mock embedding function
        mock_embedding_func.return_value = Mock()

        store = VectorStore("/tmp/test", "all-MiniLM-L6-v2")
        filter_dict = store._build_filter("Test Course", 2)
        expected = {"$and": [{"course_title": "Test Course"}, {"lesson_number": 2}]}
        assert filter_dict == expected
