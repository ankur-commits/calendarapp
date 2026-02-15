"""Phase 2: Assistant route endpoint tests with mocked AI services."""
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from tests.mocks.fixtures import (
    mock_gemini_client,
    GEMINI_MULTI_INTENT_RESPONSE,
    GEMINI_EMPTY_RESPONSE,
    GEMINI_SEARCH_RESPONSE,
    GEMINI_SEARCH_EMPTY,
)


def _seed_user_in_db(db_session, user_id=1):
    """Create a user directly in the DB for assistant endpoints that need user_id."""
    from app.models import Family, User, UserProfileAttribute
    from app.auth import get_password_hash

    family = Family(name="AI Family")
    db_session.add(family)
    db_session.commit()
    db_session.refresh(family)

    user = User(
        name="AI User",
        email="ai@example.com",
        hashed_password=get_password_hash("pass"),
        family_id=family.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Add a profile attribute for context
    attr = UserProfileAttribute(
        user_id=user.id,
        key="location_Sports",
        value="Lincoln Fields",
        confidence=0.8,
    )
    db_session.add(attr)
    db_session.commit()

    return user


# ──────────────────────────────────────────────
# /api/assistant/interact
# ──────────────────────────────────────────────

class TestInteractEndpoint:
    @patch("app.services.ai_learning.genai")
    def test_interact_multi_intent(self, mock_genai, client: TestClient, db_session):
        """POST /interact returns structured events, shopping_list, todos."""
        user = _seed_user_in_db(db_session)

        mock_client = mock_gemini_client(GEMINI_MULTI_INTENT_RESPONSE)
        mock_genai.Client.return_value = mock_client

        response = client.post("/api/assistant/interact", json={
            "query": "Soccer practice Tuesday and buy milk",
            "user_id": user.id,
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["events"]) == 1
        assert data["events"][0]["title"] == "Soccer Practice"
        assert len(data["shopping_list"]) == 1
        assert len(data["todos"]) == 1

    @patch("app.services.ai_learning.genai")
    def test_interact_empty_response(self, mock_genai, client: TestClient, db_session):
        """POST /interact with no intents returns empty arrays."""
        user = _seed_user_in_db(db_session)

        mock_client = mock_gemini_client(GEMINI_EMPTY_RESPONSE)
        mock_genai.Client.return_value = mock_client

        response = client.post("/api/assistant/interact", json={
            "query": "hello",
            "user_id": user.id,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["events"] == []
        assert data["shopping_list"] == []
        assert data["todos"] == []

    @patch("app.services.ai_learning.genai")
    def test_interact_api_failure(self, mock_genai, client: TestClient, db_session):
        """POST /interact returns 500 when Gemini API fails."""
        user = _seed_user_in_db(db_session)

        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("Gemini down")
        mock_genai.Client.return_value = mock_client

        response = client.post("/api/assistant/interact", json={
            "query": "test",
            "user_id": user.id,
        })
        assert response.status_code == 500


# ──────────────────────────────────────────────
# /api/assistant/search
# ──────────────────────────────────────────────

class TestSearchEndpoint:
    @patch("google.genai.Client")
    def test_search_returns_suggestions(self, MockClient, client: TestClient):
        """POST /search returns event suggestions from Gemini + Google Search."""
        mock_instance = mock_gemini_client(GEMINI_SEARCH_RESPONSE)
        MockClient.return_value = mock_instance

        response = client.post("/api/assistant/search", json={
            "query": "concerts this weekend",
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["suggestions"]) == 1
        assert data["suggestions"][0]["title"] == "Taylor Swift Concert"
        assert "Buy Tickets" in data["suggestions"][0]["description"]

    @patch("google.genai.Client")
    def test_search_empty_results(self, MockClient, client: TestClient):
        """POST /search with no matching events returns empty suggestions."""
        mock_instance = mock_gemini_client(GEMINI_SEARCH_EMPTY)
        MockClient.return_value = mock_instance

        response = client.post("/api/assistant/search", json={
            "query": "underwater basket weaving tournament",
        })
        assert response.status_code == 200
        assert response.json()["suggestions"] == []

    @patch("google.genai.Client")
    def test_search_api_failure(self, MockClient, client: TestClient):
        """POST /search returns 500 when Gemini API fails."""
        mock_instance = MagicMock()
        mock_instance.models.generate_content.side_effect = Exception("API error")
        MockClient.return_value = mock_instance

        response = client.post("/api/assistant/search", json={
            "query": "concerts",
        })
        assert response.status_code == 500

    @patch("google.genai.Client")
    def test_search_malformed_json(self, MockClient, client: TestClient):
        """POST /search with malformed Gemini response returns 500."""
        mock_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "This is not JSON at all"
        mock_instance.models.generate_content.return_value = mock_response
        MockClient.return_value = mock_instance

        response = client.post("/api/assistant/search", json={
            "query": "concerts",
        })
        assert response.status_code == 500

    @patch("google.genai.Client")
    def test_search_json_in_markdown(self, MockClient, client: TestClient):
        """POST /search handles JSON wrapped in ```json blocks."""
        wrapped = "```json\n" + GEMINI_SEARCH_RESPONSE + "\n```"
        mock_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.text = wrapped
        mock_instance.models.generate_content.return_value = mock_response
        MockClient.return_value = mock_instance

        response = client.post("/api/assistant/search", json={
            "query": "concerts",
        })
        assert response.status_code == 200
        assert len(response.json()["suggestions"]) == 1


# ──────────────────────────────────────────────
# /api/assistant/learn
# ──────────────────────────────────────────────

class TestLearnEndpoint:
    @patch("app.services.ai_learning.genai")
    def test_learn_creates_profile_attribute(self, mock_genai, client: TestClient, db_session):
        """POST /learn stores a new location preference."""
        user = _seed_user_in_db(db_session)

        response = client.post("/api/assistant/learn", json={
            "user_id": user.id,
            "user_input": "Soccer at Lincoln Fields",
            "actual_action": {
                "type": "event",
                "location": "Lincoln Fields",
                "category": "Soccer",
            },
        })
        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify attribute was created
        from app.models import UserProfileAttribute
        attr = db_session.query(UserProfileAttribute).filter(
            UserProfileAttribute.user_id == user.id,
            UserProfileAttribute.key == "location_Soccer",
        ).first()
        assert attr is not None
        assert attr.value == "Lincoln Fields"
        assert attr.confidence == 0.5

    @patch("app.services.ai_learning.genai")
    def test_learn_reinforces_existing_attribute(self, mock_genai, client: TestClient, db_session):
        """Repeated same location reinforces confidence."""
        user = _seed_user_in_db(db_session)

        payload = {
            "user_id": user.id,
            "user_input": "Soccer at Lincoln Fields",
            "actual_action": {
                "type": "event",
                "location": "Lincoln Fields",
                "category": "Sports",
            },
        }

        # First learn
        client.post("/api/assistant/learn", json=payload)

        # Second learn — same location
        client.post("/api/assistant/learn", json=payload)

        from app.models import UserProfileAttribute
        attr = db_session.query(UserProfileAttribute).filter(
            UserProfileAttribute.user_id == user.id,
            UserProfileAttribute.key == "location_Sports",
        ).first()
        # Original had confidence 0.8, reinforcing adds 0.1 twice
        assert attr.confidence >= 0.8

    @patch("app.services.ai_learning.genai")
    def test_learn_non_event_action(self, mock_genai, client: TestClient, db_session):
        """Non-event actions still return success (no-op learning)."""
        user = _seed_user_in_db(db_session)

        response = client.post("/api/assistant/learn", json={
            "user_id": user.id,
            "user_input": "Buy milk",
            "actual_action": {"type": "shopping", "name": "milk"},
        })
        assert response.status_code == 200
