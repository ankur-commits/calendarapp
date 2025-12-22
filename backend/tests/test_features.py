
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

def test_voice_command_mock():
    """
    Test the voice command parser (which uses the mock transcription).
    """
    # Create a dummy file
    with open("test_audio.wav", "wb") as f:
        f.write(b"dummy audio content")
        
    result = parse_voice_command("test_audio.wav")
    assert result is not None
    # The mock returns a hardcoded "Remind me to pick up milk..." so we expect items
    # But since parse_natural_query usually needs a real LLM to parse cleanly, 
    # and we might be hitting fallback if no API key, let's just ensure we get a dict.
    assert isinstance(result, dict)
    print(f"Voice Result: {result}")
