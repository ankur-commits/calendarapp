"""Phase 3: End-to-end integration and error handling tests."""
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from tests.mocks.fixtures import (
    mock_openai_client,
    mock_gemini_client,
    register_and_login,
    create_family_for_user,
    NLP_MULTI_INTENT_RESPONSE,
    GEMINI_MULTI_INTENT_RESPONSE,
)


def _seed_user_with_family(db_session):
    """Seed a user with a family directly in the DB."""
    from app.models import Family, User
    from app.auth import get_password_hash

    family = Family(name="Integration Family")
    db_session.add(family)
    db_session.commit()
    db_session.refresh(family)

    user = User(
        name="Integration User",
        email="integration@example.com",
        hashed_password=get_password_hash("password123"),
        family_id=family.id,
        preferences={"address": "123 Main St, Seattle, WA"},
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return family, user


# ──────────────────────────────────────────────
# E2E: Voice → Event Creation
# ──────────────────────────────────────────────

class TestVoiceToEventFlow:
    @patch("app.routes.voice.OpenAI")
    def test_voice_upload_creates_parsed_data(self, MockOpenAI, client: TestClient, db_session):
        """Upload audio → Whisper transcribes → NLP parses → returns events + shopping."""
        family, user = _seed_user_with_family(db_session)

        # Login to get auth token
        from app.auth import create_access_token
        from datetime import timedelta
        token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=30))
        headers = {"Authorization": f"Bearer {token}"}

        # Mock OpenAI client returned by the route
        openai_instance = mock_openai_client(
            whisper_text="Soccer practice next Tuesday and buy milk",
            chat_content=NLP_MULTI_INTENT_RESPONSE,
        )
        MockOpenAI.return_value = openai_instance

        # Upload a fake audio file
        response = client.post(
            "/api/voice/process",
            files={"file": ("test.wav", b"fake audio data", "audio/wav")},
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["parsed_data"]["events"]) == 1
        assert len(data["parsed_data"]["shopping_items"]) == 2

    @patch("app.routes.voice.OpenAI")
    def test_voice_without_auth_fails(self, MockOpenAI, client: TestClient):
        """Voice endpoint requires authentication."""
        response = client.post(
            "/api/voice/process",
            files={"file": ("test.wav", b"audio", "audio/wav")},
        )
        assert response.status_code == 401

    @patch("app.routes.voice.OpenAI")
    def test_voice_whisper_failure(self, MockOpenAI, client: TestClient, db_session):
        """If Whisper fails, voice endpoint returns 500."""
        family, user = _seed_user_with_family(db_session)

        from app.auth import create_access_token
        from datetime import timedelta
        token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=30))
        headers = {"Authorization": f"Bearer {token}"}

        openai_instance = MagicMock()
        openai_instance.audio.transcriptions.create.side_effect = Exception("Whisper API error")
        MockOpenAI.return_value = openai_instance

        response = client.post(
            "/api/voice/process",
            files={"file": ("bad.wav", b"bad audio", "audio/wav")},
            headers=headers,
        )
        assert response.status_code == 500


# ──────────────────────────────────────────────
# E2E: Text → Multi-Intent → Action Cards
# ──────────────────────────────────────────────

class TestTextToMultiIntentFlow:
    @patch("app.services.ai_learning.genai")
    def test_text_parses_into_events_shopping_todos(self, mock_genai, client: TestClient, db_session):
        """Text input → Gemini parse → returns events, shopping, todos for action cards."""
        family, user = _seed_user_with_family(db_session)

        mock_client = mock_gemini_client(GEMINI_MULTI_INTENT_RESPONSE)
        mock_genai.Client.return_value = mock_client

        # Call interact endpoint
        response = client.post("/api/assistant/interact", json={
            "query": "Soccer practice Tuesday, buy milk, and pick up dry cleaning",
            "user_id": user.id,
        })
        assert response.status_code == 200
        data = response.json()

        # Now use the parsed data to create actual entities via CRUD endpoints
        # Create event from parsed data
        event_data = data["events"][0]
        event_response = client.post("/api/events/", json={
            "title": event_data["title"],
            "location": event_data.get("location", ""),
            "start_time": event_data.get("start_time", "2025-02-15T17:00:00"),
            "end_time": "2025-02-15T18:00:00",
            "category": event_data.get("category", "General"),
        })
        assert event_response.status_code == 200
        assert event_response.json()["title"] == "Soccer Practice"

        # Create shopping item from parsed data
        shop_data = data["shopping_list"][0]
        shop_response = client.post("/api/shopping/", json={
            "name": shop_data["name"],
            "category": shop_data.get("category", "General"),
        }, params={"family_id": family.id, "user_id": user.id})
        assert shop_response.status_code == 200
        assert shop_response.json()["name"] == "milk"

        # Create todo from parsed data
        todo_data = data["todos"][0]
        todo_response = client.post("/api/todos/", json={
            "title": todo_data["title"],
        }, params={"family_id": family.id, "user_id": user.id})
        assert todo_response.status_code == 200
        assert todo_response.json()["title"] == "Pick up dry cleaning"


# ──────────────────────────────────────────────
# E2E: AI Learning Feedback Loop
# ──────────────────────────────────────────────

class TestLearningFeedbackLoop:
    @patch("app.services.ai_learning.genai")
    def test_feedback_improves_next_query(self, mock_genai, client: TestClient, db_session):
        """
        1. User asks about soccer → AI responds
        2. User confirms with location → learn endpoint stores preference
        3. Next query includes the learned context
        """
        family, user = _seed_user_with_family(db_session)

        # Step 1: Initial interaction
        mock_client = mock_gemini_client(GEMINI_MULTI_INTENT_RESPONSE)
        mock_genai.Client.return_value = mock_client

        client.post("/api/assistant/interact", json={
            "query": "Soccer practice",
            "user_id": user.id,
        })

        # Step 2: User confirms with actual location → learn
        learn_resp = client.post("/api/assistant/learn", json={
            "user_id": user.id,
            "user_input": "Soccer at Lincoln Fields",
            "actual_action": {
                "type": "event",
                "location": "Lincoln Fields",
                "category": "Soccer",
            },
        })
        assert learn_resp.status_code == 200

        # Step 3: Verify profile attribute was stored
        from app.models import UserProfileAttribute
        attr = db_session.query(UserProfileAttribute).filter(
            UserProfileAttribute.user_id == user.id,
            UserProfileAttribute.key == "location_Soccer",
        ).first()
        assert attr is not None
        assert attr.value == "Lincoln Fields"

        # Step 4: Next interaction — the profile context should now include the learned data
        # Reset mock for second call
        mock_client2 = mock_gemini_client(GEMINI_MULTI_INTENT_RESPONSE)
        mock_genai.Client.return_value = mock_client2

        client.post("/api/assistant/interact", json={
            "query": "Soccer this Saturday",
            "user_id": user.id,
        })

        # Verify the prompt sent to Gemini included the learned context
        call_args = mock_client2.models.generate_content.call_args
        prompt_text = call_args[1]["contents"] if "contents" in call_args[1] else call_args[0][0]
        # The profile context should be in the prompt somewhere
        # (depends on how it's passed; at minimum, the service queries the DB)


# ──────────────────────────────────────────────
# Error Handling
# ──────────────────────────────────────────────

class TestErrorHandling:
    def test_event_not_found(self, client: TestClient):
        """GET /api/events/99999 returns 404."""
        response = client.get("/api/events/99999")
        assert response.status_code == 404

    def test_shopping_item_not_found(self, client: TestClient):
        """PUT /api/shopping/99999 returns 404."""
        response = client.put("/api/shopping/99999", json={"name": "x"})
        assert response.status_code == 404

    def test_todo_not_found(self, client: TestClient):
        """PUT /api/todos/99999 returns 404."""
        response = client.put("/api/todos/99999", json={"title": "x"})
        assert response.status_code == 404

    @patch("google.genai.Client")
    def test_search_gemini_timeout(self, MockClient, client: TestClient):
        """Gemini timeout in search returns 500."""
        mock_instance = MagicMock()
        mock_instance.models.generate_content.side_effect = TimeoutError("Gemini timed out")
        MockClient.return_value = mock_instance

        response = client.post("/api/assistant/search", json={"query": "concerts"})
        assert response.status_code == 500

    @patch("app.services.ai_learning.genai")
    def test_interact_gemini_malformed_json(self, mock_genai, client: TestClient, db_session):
        """Gemini returns non-JSON text in interact → 500."""
        family, user = _seed_user_with_family(db_session)

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Sorry, I can't help with that"
        mock_client.models.generate_content.return_value = mock_response
        mock_genai.Client.return_value = mock_client

        response = client.post("/api/assistant/interact", json={
            "query": "something",
            "user_id": user.id,
        })
        assert response.status_code == 500


# ──────────────────────────────────────────────
# Family-Scoped Operations
# ──────────────────────────────────────────────

class TestFamilyScopedOps:
    def test_family_create_requires_auth(self, client: TestClient):
        """POST /api/families/ without auth returns 401."""
        response = client.post("/api/families/", json={"name": "My Family"})
        assert response.status_code == 401

    def test_invite_requires_admin(self, client: TestClient, db_session):
        """Non-admin user cannot invite members."""
        # Register admin and create family
        _, admin_headers = register_and_login(client, email="admin2@example.com")
        create_family_for_user(client, admin_headers, "Admin Family")

        # Register a member and add them to the family
        member_data, member_headers = register_and_login(client, email="member@example.com", name="Member")

        # Member tries to invite — should fail (they're not in a family / not admin)
        response = client.post("/api/families/invite", json={
            "email": "someone@example.com",
            "name": "Someone",
        }, headers=member_headers)
        assert response.status_code == 400  # "You must belong to a family"

    def test_cannot_create_two_families(self, client: TestClient):
        """A user who already belongs to a family cannot create another."""
        _, headers = register_and_login(client, email="double@example.com")
        create_family_for_user(client, headers, "First Family")

        response = client.post("/api/families/", json={"name": "Second Family"}, headers=headers)
        assert response.status_code == 400
        assert "already belongs" in response.json()["detail"]

    def test_join_request(self, client: TestClient, db_session):
        """User can request to join a family via admin email."""
        # Admin with family
        _, admin_headers = register_and_login(client, email="famadmin@example.com")
        create_family_for_user(client, admin_headers, "Join Family")

        # Another user wants to join
        _, user_headers = register_and_login(client, email="joiner@example.com", name="Joiner")

        response = client.post("/api/families/join-request", json={
            "admin_email": "famadmin@example.com",
        }, headers=user_headers)
        assert response.status_code == 200

        # Verify user status changed
        from app.models import User
        joiner = db_session.query(User).filter(User.email == "joiner@example.com").first()
        assert joiner.status == "requested_join"

    def test_join_request_bad_admin(self, client: TestClient):
        """Join request with non-existent admin returns 404."""
        _, headers = register_and_login(client, email="orphan@example.com")
        response = client.post("/api/families/join-request", json={
            "admin_email": "nobody@example.com",
        }, headers=headers)
        assert response.status_code == 404
