"""
Shared mock fixtures for external API dependencies.
Used across service tests, route tests, and integration tests.
"""
from unittest.mock import MagicMock, AsyncMock
import json


# ──────────────────────────────────────────────
# OpenAI Mock Responses
# ──────────────────────────────────────────────

def make_openai_chat_response(content: str) -> MagicMock:
    """Build a mock OpenAI chat completion response."""
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = content
    return mock_response


def make_openai_whisper_response(text: str) -> MagicMock:
    """Build a mock Whisper transcription response."""
    mock_response = MagicMock()
    mock_response.text = text
    return mock_response


def mock_openai_client(chat_content: str = None, whisper_text: str = None) -> MagicMock:
    """
    Create a fully mocked OpenAI client with both chat and audio mocks.
    """
    client = MagicMock()

    if chat_content is not None:
        client.chat.completions.create.return_value = make_openai_chat_response(chat_content)

    if whisper_text is not None:
        client.audio.transcriptions.create.return_value = make_openai_whisper_response(whisper_text)

    return client


# ──────────────────────────────────────────────
# OpenAI: NLP parsing responses
# ──────────────────────────────────────────────

NLP_MULTI_INTENT_RESPONSE = json.dumps({
    "events": [
        {
            "title": "Soccer Practice",
            "description": "Weekly soccer practice",
            "location": "Lincoln Fields",
            "start_time": "17:00",
            "end_time": "18:00",
            "date": "2025-02-15",
            "attendees": ["Jake"],
            "category": "Sports & Recreation"
        }
    ],
    "chores": [
        {
            "title": "Clean room",
            "assigned_to": "Timmy",
            "due_date": "2025-02-14",
            "reward_amount": 5
        }
    ],
    "shopping_items": [
        {"name": "milk", "category": "Food"},
        {"name": "bread", "category": "Food"}
    ]
})

NLP_SINGLE_EVENT_RESPONSE = json.dumps({
    "events": [
        {
            "title": "Doctor Appointment",
            "description": "Annual checkup",
            "location": "City Hospital",
            "start_time": "10:00",
            "end_time": "11:00",
            "date": "2025-02-20",
            "attendees": [],
            "category": "Health & Wellness"
        }
    ],
    "chores": [],
    "shopping_items": []
})

NLP_SHOPPING_ONLY_RESPONSE = json.dumps({
    "events": [],
    "chores": [],
    "shopping_items": [
        {"name": "eggs", "category": "Food"},
        {"name": "paper towels", "category": "General"}
    ]
})

NLP_EMPTY_RESPONSE = json.dumps({
    "events": [],
    "chores": [],
    "shopping_items": []
})


# ──────────────────────────────────────────────
# OpenAI: Classifier responses
# ──────────────────────────────────────────────

CLASSIFIER_MUSIC = "Music"
CLASSIFIER_SPORTS = "Sports & Recreation"
CLASSIFIER_OTHER = "Other"


# ──────────────────────────────────────────────
# Gemini Mock Responses
# ──────────────────────────────────────────────

GEMINI_MULTI_INTENT_RESPONSE = json.dumps({
    "events": [
        {
            "title": "Soccer Practice",
            "start_time": "2025-02-15T17:00:00",
            "location": "Lincoln Fields",
            "attendees": ["Jake"],
            "category": "Sports & Recreation"
        }
    ],
    "shopping_list": [
        {"name": "milk", "category": "General"}
    ],
    "todos": [
        {"title": "Pick up dry cleaning", "due_date": "2025-02-14", "assigned_to": "Dad"}
    ]
})

GEMINI_EMPTY_RESPONSE = json.dumps({
    "events": [],
    "shopping_list": [],
    "todos": []
})

GEMINI_SEARCH_RESPONSE = json.dumps({
    "suggestions": [
        {
            "title": "Taylor Swift Concert",
            "description": "The Eras Tour at MetLife Stadium",
            "start_time": "2025-03-01T19:00:00",
            "end_time": "2025-03-01T23:00:00",
            "location": "MetLife Stadium, East Rutherford, NJ",
            "budget_estimate": "$150-$500 per person",
            "travel_time_minutes": 45,
            "category": "Music",
            "suggested_attendees": ["Family"],
            "reasoning": "Popular concert matching your search",
            "ticket_url": "https://example.com/tickets"
        }
    ]
})

GEMINI_SEARCH_EMPTY = json.dumps({"suggestions": []})


def mock_gemini_client(response_text: str) -> MagicMock:
    """Create a mocked google.genai.Client."""
    client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = response_text
    client.models.generate_content.return_value = mock_response
    return client


# ──────────────────────────────────────────────
# Ticketmaster Mock Responses
# ──────────────────────────────────────────────

TICKETMASTER_EVENTS_RESPONSE = {
    "_embedded": {
        "events": [
            {
                "name": "Rock Concert",
                "url": "https://ticketmaster.com/event/123",
                "images": [{"url": "https://example.com/image.jpg"}],
                "_embedded": {
                    "venues": [{
                        "name": "Madison Square Garden",
                        "city": {"name": "New York"}
                    }]
                },
                "dates": {"start": {"dateTime": "2025-03-01T20:00:00Z"}},
                "priceRanges": [{"min": 50, "max": 200, "currency": "USD"}],
                "classifications": [{"segment": {"name": "Music"}}]
            },
            {
                "name": "Basketball Game",
                "url": "https://ticketmaster.com/event/456",
                "images": [],
                "_embedded": {
                    "venues": [{
                        "name": "Barclays Center",
                        "city": {"name": "Brooklyn"}
                    }]
                },
                "dates": {"start": {"localDate": "2025-03-02"}},
                "priceRanges": [],
                "classifications": [{"segment": {"name": "Sports"}}]
            }
        ]
    }
}

TICKETMASTER_EMPTY_RESPONSE = {}

TICKETMASTER_NO_EVENTS_RESPONSE = {"_embedded": {"events": []}}


# ──────────────────────────────────────────────
# Test data helpers
# ──────────────────────────────────────────────

def register_and_login(client, email="test@example.com", password="password123", name="Test User"):
    """Register a user and return (user_data, auth_headers)."""
    reg = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": password,
        "role": "admin",
    })
    user_data = reg.json()

    login = client.post("/api/auth/token", data={
        "username": email,
        "password": password,
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return user_data, headers


def create_family_for_user(client, headers, family_name="Test Family"):
    """Create a family for an authenticated user. Returns family data."""
    res = client.post("/api/families/", json={"name": family_name}, headers=headers)
    return res.json()
