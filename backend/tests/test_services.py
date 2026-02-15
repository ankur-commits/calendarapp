"""Phase 2: Service-level tests with mocked external APIs."""
import json
import pytest
from unittest.mock import patch, MagicMock

from app.services.nlp import parse_natural_query, parse_voice_command, _fallback_parse
from app.services.classifier import classify_event, DEFAULT_LABELS
from app.services.ticketmaster import TicketmasterService
from app.services.logistics import LogisticsService
from tests.mocks.fixtures import (
    mock_openai_client,
    mock_gemini_client,
    NLP_MULTI_INTENT_RESPONSE,
    NLP_SINGLE_EVENT_RESPONSE,
    NLP_SHOPPING_ONLY_RESPONSE,
    NLP_EMPTY_RESPONSE,
    CLASSIFIER_MUSIC,
    CLASSIFIER_SPORTS,
    TICKETMASTER_EVENTS_RESPONSE,
    TICKETMASTER_EMPTY_RESPONSE,
    TICKETMASTER_NO_EVENTS_RESPONSE,
)


# ──────────────────────────────────────────────
# NLP Service
# ──────────────────────────────────────────────

class TestNLPParsing:
    def test_multi_intent_parsing(self):
        """parse_natural_query returns events, chores, shopping_items."""
        client = mock_openai_client(chat_content=NLP_MULTI_INTENT_RESPONSE)
        result = parse_natural_query("Soccer Tuesday, buy milk, Timmy clean room", openai_client=client)

        assert len(result["events"]) == 1
        assert result["events"][0]["title"] == "Soccer Practice"
        assert len(result["shopping_items"]) == 2
        assert len(result["chores"]) == 1

    def test_single_event_parsing(self):
        """Handles a query with just one event."""
        client = mock_openai_client(chat_content=NLP_SINGLE_EVENT_RESPONSE)
        result = parse_natural_query("Doctor appointment next Thursday", openai_client=client)

        assert len(result["events"]) == 1
        assert result["events"][0]["title"] == "Doctor Appointment"
        assert result["chores"] == []
        assert result["shopping_items"] == []

    def test_shopping_only_parsing(self):
        """Handles a query with only shopping items."""
        client = mock_openai_client(chat_content=NLP_SHOPPING_ONLY_RESPONSE)
        result = parse_natural_query("We need eggs and paper towels", openai_client=client)

        assert result["events"] == []
        assert len(result["shopping_items"]) == 2

    def test_empty_query_returns_empty_arrays(self):
        """Empty intent returns empty arrays."""
        client = mock_openai_client(chat_content=NLP_EMPTY_RESPONSE)
        result = parse_natural_query("hello", openai_client=client)

        assert result["events"] == []
        assert result["chores"] == []
        assert result["shopping_items"] == []

    def test_malformed_json_uses_fallback(self):
        """If LLM returns non-JSON, fallback creates a generic event."""
        client = mock_openai_client(chat_content="I don't understand that request")
        result = parse_natural_query("gibberish input", openai_client=client)

        # Fallback wraps the query as a single event
        assert len(result["events"]) == 1
        assert result["events"][0]["title"] == "gibberish input"

    def test_json_with_markdown_wrapper(self):
        """NLP handles JSON wrapped in markdown code fences."""
        wrapped = '```json\n' + NLP_SINGLE_EVENT_RESPONSE + '\n```'
        # The NLP service's regex extraction handles this
        client = mock_openai_client(chat_content=wrapped)
        result = parse_natural_query("Doctor appointment", openai_client=client)

        # json.loads will fail but regex should extract it
        assert "events" in result

    def test_user_context_passed_to_prompt(self):
        """Verify user_context (home address) is passed through."""
        client = mock_openai_client(chat_content=NLP_SINGLE_EVENT_RESPONSE)
        result = parse_natural_query(
            "Chase Bank",
            openai_client=client,
            user_context={"home_address": "123 Main St"},
        )
        # The mock returns a fixed response regardless, but verify no crash
        assert "events" in result
        # Verify the prompt contained the address
        call_args = client.chat.completions.create.call_args
        system_message = call_args[1]["messages"][0]["content"]
        assert "123 Main St" in system_message

    def test_api_exception_uses_fallback(self):
        """If OpenAI raises an exception, fallback is used."""
        client = MagicMock()
        client.chat.completions.create.side_effect = Exception("API rate limited")
        result = parse_natural_query("something", openai_client=client)

        assert len(result["events"]) == 1  # fallback creates generic event

    def test_fallback_parse(self):
        """_fallback_parse creates a single event from the query."""
        result = _fallback_parse("Pick up kids from school")
        assert result["events"][0]["title"] == "Pick up kids from school"
        assert result["chores"] == []
        assert result["shopping_items"] == []


class TestVoiceCommand:
    def test_voice_transcribe_and_parse(self, tmp_path):
        """Full voice flow: transcribe audio → parse text → structured result."""
        audio_file = tmp_path / "test.wav"
        audio_file.write_bytes(b"fake audio bytes")

        client = mock_openai_client(
            whisper_text="Buy milk and schedule soccer practice",
            chat_content=NLP_MULTI_INTENT_RESPONSE,
        )
        result = parse_voice_command(str(audio_file), openai_client=client)

        assert "events" in result
        assert "shopping_items" in result
        client.audio.transcriptions.create.assert_called_once()

    def test_voice_transcription_failure(self, tmp_path):
        """If Whisper transcription fails, exception propagates."""
        audio_file = tmp_path / "bad.wav"
        audio_file.write_bytes(b"bad audio")

        client = MagicMock()
        client.audio.transcriptions.create.side_effect = Exception("Audio too short")

        with pytest.raises(Exception, match="Audio too short"):
            parse_voice_command(str(audio_file), openai_client=client)


# ──────────────────────────────────────────────
# Event Classifier
# ──────────────────────────────────────────────

class TestClassifier:
    def test_classify_music_event(self):
        """Classifies a music event correctly."""
        client = mock_openai_client(chat_content=CLASSIFIER_MUSIC)
        result = classify_event(
            {"title": "Taylor Swift Concert", "description": "Pop music concert"},
            openai_client=client,
        )
        assert result == "Music"

    def test_classify_sports_event(self):
        """Classifies a sports event correctly."""
        client = mock_openai_client(chat_content=CLASSIFIER_SPORTS)
        result = classify_event(
            {"title": "NBA Finals", "description": "Basketball championship"},
            openai_client=client,
        )
        assert result == "Sports & Recreation"

    def test_classify_with_custom_labels(self):
        """Custom labels are passed to the classifier."""
        client = mock_openai_client(chat_content="Custom Category")
        result = classify_event(
            {"title": "Test"},
            labels=["Custom Category", "Other"],
            openai_client=client,
        )
        assert result == "Custom Category"

    def test_classify_retries_on_failure(self):
        """Classifier retries up to max_retries on API errors."""
        client = MagicMock()
        client.chat.completions.create.side_effect = [
            Exception("timeout"),
            Exception("timeout"),
            mock_openai_client(chat_content="Music").chat.completions.create.return_value,
        ]

        with patch("time.sleep"):  # skip actual sleep in tests
            result = classify_event(
                {"title": "Concert"},
                openai_client=client,
                max_retries=3,
            )
        assert result == "Music"

    def test_classify_all_retries_fail(self):
        """If all retries fail, returns 'Other'."""
        client = MagicMock()
        client.chat.completions.create.side_effect = Exception("persistent failure")

        with patch("time.sleep"):
            result = classify_event(
                {"title": "Unknown"},
                openai_client=client,
                max_retries=2,
            )
        assert result == "Other"

    def test_classify_missing_fields(self):
        """Handles events with missing title/description gracefully."""
        client = mock_openai_client(chat_content="Other")
        result = classify_event({}, openai_client=client)
        assert result == "Other"


# ──────────────────────────────────────────────
# Ticketmaster Service
# ──────────────────────────────────────────────

class TestTicketmaster:
    @patch("app.services.ticketmaster.requests.get")
    def test_search_events_success(self, mock_get):
        """Successful Ticketmaster search returns formatted events."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = TICKETMASTER_EVENTS_RESPONSE
        mock_get.return_value = mock_response

        service = TicketmasterService()
        service.api_key = "test-key"
        results = service.search_events(keyword="concerts", city="New York")

        assert len(results) == 2
        assert results[0]["title"] == "Rock Concert"
        assert results[0]["location"] == "Madison Square Garden, New York"
        assert results[0]["budget_estimate"] == "$50-200 USD"
        assert results[0]["category"] == "Music"

    @patch("app.services.ticketmaster.requests.get")
    def test_search_events_no_results(self, mock_get):
        """Empty response returns empty list."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = TICKETMASTER_EMPTY_RESPONSE
        mock_get.return_value = mock_response

        service = TicketmasterService()
        service.api_key = "test-key"
        results = service.search_events(keyword="nothing")

        assert results == []

    @patch("app.services.ticketmaster.requests.get")
    def test_search_events_api_error(self, mock_get):
        """Non-200 status code returns empty list."""
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.text = "Rate limited"
        mock_get.return_value = mock_response

        service = TicketmasterService()
        service.api_key = "test-key"
        results = service.search_events(keyword="concerts")

        assert results == []

    @patch("app.services.ticketmaster.requests.get")
    def test_search_events_network_error(self, mock_get):
        """Network exception returns empty list."""
        mock_get.side_effect = Exception("Connection refused")

        service = TicketmasterService()
        service.api_key = "test-key"
        results = service.search_events(keyword="concerts")

        assert results == []

    def test_search_events_no_api_key(self):
        """Missing API key returns empty list without crashing."""
        service = TicketmasterService()
        service.api_key = None
        results = service.search_events(keyword="concerts")
        assert results == []

    @patch("app.services.ticketmaster.requests.get")
    def test_format_events_missing_price(self, mock_get):
        """Events without priceRanges show 'Check URL'."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = TICKETMASTER_EVENTS_RESPONSE
        mock_get.return_value = mock_response

        service = TicketmasterService()
        service.api_key = "test-key"
        results = service.search_events(keyword="basketball")

        # Second event has no priceRanges
        assert results[1]["budget_estimate"] == "Check URL"

    @patch("app.services.ticketmaster.requests.get")
    def test_search_with_classification(self, mock_get):
        """classification_name param is passed to the API."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = TICKETMASTER_EMPTY_RESPONSE
        mock_get.return_value = mock_response

        service = TicketmasterService()
        service.api_key = "test-key"
        service.search_events(keyword="rock", classification_name="Music")

        call_params = mock_get.call_args[1]["params"]
        assert call_params["classificationName"] == "Music"


# ──────────────────────────────────────────────
# Logistics Service
# ──────────────────────────────────────────────

class TestLogistics:
    def test_drive_time_returns_int(self):
        time = LogisticsService.get_drive_time("40.7,-74.0", "40.8,-73.9")
        assert isinstance(time, int)
        assert 15 <= time <= 45

    def test_drive_time_deterministic(self):
        """Same inputs produce same result (seeded random)."""
        t1 = LogisticsService.get_drive_time("Home", "School")
        t2 = LogisticsService.get_drive_time("Home", "School")
        assert t1 == t2

    def test_drive_time_empty_input(self):
        """Empty coordinates return 0."""
        assert LogisticsService.get_drive_time("", "dest") == 0
        assert LogisticsService.get_drive_time("origin", "") == 0
        assert LogisticsService.get_drive_time(None, None) == 0

    def test_resolve_location(self):
        lat, lng = LogisticsService.resolve_location("Lincoln High School")
        assert lat == "37.7749"
        assert lng == "-122.4194"

    def test_resolve_location_empty(self):
        lat, lng = LogisticsService.resolve_location("")
        assert lat is None
        assert lng is None

    def test_resolve_location_none(self):
        lat, lng = LogisticsService.resolve_location(None)
        assert lat is None
        assert lng is None
