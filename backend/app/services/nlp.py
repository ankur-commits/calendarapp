import json
import re
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any
import openai
from openai import OpenAI
import os

def parse_natural_query(
    query: str,
    openai_client: Optional[OpenAI] = None,
    model: str = "gpt-4o-mini",
    user_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Parse a natural language query into structured data for a family calendar application.
    Supports "Stream of Consciousness" input containing multiple entities.
    """
    
    client = openai_client or OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    today = date.today()
    current_date = today.strftime("%Y-%m-%d")
    current_weekday = today.strftime("%A")
    
    # Calculate next 7 days map for the LLM
    next_7_days = []
    for i in range(1, 8):
         d = today + timedelta(days=i)
         next_7_days.append(f"{d.strftime('%A')}: {d.strftime('%Y-%m-%d')}")
    next_7_days_str = "\n    - ".join(next_7_days)
    
    # Address Context
    address_context = ""
    if user_context and user_context.get("home_address"):
        address_context = f"- User's Home Address: {user_context.get('home_address')}\n    (If a generic location name like 'Chase Bank' or 'Grocery Store' is given, assume it is the one closest to this address)"

    system_prompt = f"""You are an intelligent Family Operating System assistant. Your job is to parse unstructured "stream of consciousness" text from a parent into structured JSON.
    
    Current Context:
    - Today: {current_date} ({current_weekday})
    - Upcoming Days Reference:
    - {next_7_days_str}
    {address_context}
    
    The user may describe mixed intent types in a single message:
    1. Calendar Events (appointments, sports, meetings)
    2. Chores (tasks assigned to people)
    3. Shopping Items (groceries, supplies)
    
    Output JSON structure:
    {{
        "events": [
            {{
                "title": "Concise Title",
                "description": "Details",
                "location": "Location Name (Specific address if inferred from home + generic name)",
                "start_time": "HH:MM" (24h),
                "end_time": "HH:MM" (24h, infer duration if missing, default 1h),
                "date": "YYYY-MM-DD",
                "attendees": ["Name1"],
                "category": "Category"
            }}
        ],
        "chores": [
            {{
                "title": "Chore Title",
                "assigned_to": "Name",
                "due_date": "YYYY-MM-DD",
                "reward_amount": 0
            }}
        ],
        "shopping_items": [
            {{
                "name": "Item Name",
                "category": "Food/General"
            }}
        ]
    }}
    
    Rules:
    - If date is "next Tuesday", calculate YYYY-MM-DD based on Current Date.
    - If "tonight", assume 19:00 today.
    - Infer attendees and assignments from context (e.g., "Tell Dad to fix the sink" -> chore assigned to Dad).
    - Return empty arrays if no items of that type are found.
    - Return ONLY valid JSON.
    """

    try:
        response = client.chat.completions.create(
            model=model,
            temperature=0.0,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Parse this family intent: {query}"}
            ]
        )
        
        result_text = response.choices[0].message.content.strip()
        
        try:
            parsed_result = json.loads(result_text)
        except json.JSONDecodeError:
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                parsed_result = json.loads(json_match.group())
            else:
                # If completely failed to parse JSON, wrap as a single generic event
                return _fallback_parse(query)
                
        # Validate structure
        if "events" not in parsed_result: parsed_result["events"] = []
        if "chores" not in parsed_result: parsed_result["chores"] = []
        if "shopping_items" not in parsed_result: parsed_result["shopping_items"] = []
        
        return parsed_result
        
    except Exception as e:
        print(f"Error parsing query with LLM: {e}")
        return _fallback_parse(query)


def _resolve_day_to_date(day_name: str) -> Optional[date]:
    # Helper no longer primarily used by LLM but kept for utility
    days_of_week = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    try:
        target_day_index = days_of_week.index(day_name.lower())
    except ValueError:
        return None
    
    today = date.today()
    today_index = today.weekday()
    
    days_until = (target_day_index - today_index + 7) % 7
    if days_until == 0:
        days_until = 7
    
    next_date = today + timedelta(days=days_until)
    return next_date


def _fallback_parse(query: str) -> Dict[str, Any]:
    """
    Fallback that creates a simple event from the query string.
    """
    return {
        "events": [{
            "title": query,
            "start_time": "09:00",
            "end_time": "10:00",
            "date": date.today().strftime("%Y-%m-%d"),
            "category": "General"
        }],
        "chores": [],
        "shopping_items": []
    }

def parse_voice_command(
    audio_file_path: str,
    openai_client: Optional[OpenAI] = None,
    user_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Transcribes audio file using Whisper and then parses the intent.
    """
    client = openai_client or OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # 1. Transcribe
    try:
        with open(audio_file_path, "rb") as audio_file:
            print(f"Transcribing file: {audio_file_path}")
            transcription = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file
            )
            text = transcription.text
            print(f"Transcription result: {text}")
            
    except Exception as e:
        print(f"Transcription failed: {e}")
        # Fallback or re-raise
        raise e
    
    return parse_natural_query(text, openai_client=client, user_context=user_context)
