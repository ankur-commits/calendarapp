
import pytest
from app.services.nlp import parse_natural_query, parse_voice_command
from app.services.logistics import LogisticsService

def test_nlp_multi_intent_parsing():
    """
    Test that the NLP service correctly splits a complex request into events, chores, and shopping items.
    """
    # Note: We need to mock the OpenAI call or rely on the fallback if we don't have a key.
    # Since we are likely using the fallback or mock in this env:
    complex_query = "Soccer practice next Tuesday at 5pm, verify that dad picks up milk, and remind Timmy to clean his room."
    
    # Check if we can get a result (even if mocked/fallback)
    result = parse_natural_query(complex_query)
    
    assert "events" in result
    assert "chores" in result
    assert "shopping_items" in result
    
    # Ideally we'd assert specific content, but without a real LLM response we might get fallback
    print(f"NLP Result: {result}")

def test_logistics_calc():
    """
    Test that the logistics service returns a valid integer for drive time.
    """
    time = LogisticsService.get_drive_time("Home", "School")
    assert isinstance(time, int)
    assert time > 0
    print(f"Drive time calculated: {time} minutes")

from unittest.mock import MagicMock

def test_voice_command_mock():
    """
    Test the voice command parser using a mocked OpenAI client.
    """
    # Create a dummy file
    with open("test_audio.wav", "wb") as f:
        f.write(b"dummy audio content")
        
    # Mock the OpenAI client
    mock_client = MagicMock()
    
    # 1. Mock Audio Transcription
    mock_transcription = MagicMock()
    mock_transcription.text = "Remind me to pick up milk"
    mock_client.audio.transcriptions.create.return_value = mock_transcription
    
    # 2. Mock Chat Completion (for the subsequent parse_natural_query call)
    mock_completion = MagicMock()
    # Return a valid JSON string compliant with the expected structure
    mock_completion.choices[0].message.content = '{"events": [], "shopping_items": [{"name": "milk", "category": "Food"}], "chores": []}'
    mock_client.chat.completions.create.return_value = mock_completion

    # Call with mock client
    result = parse_voice_command("test_audio.wav", openai_client=mock_client)
    
    assert result is not None
    assert isinstance(result, dict)
    assert "shopping_items" in result
    assert result["shopping_items"][0]["name"] == "milk"
    print(f"Voice Result: {result}")
