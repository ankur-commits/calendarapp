"""
nlp_query_parser.py
-------------------
Natural Language Processing module for parsing free-form event search queries.
Extracts structured search parameters from natural language input like:
"music events for kids after 5 pm on saturday"

Uses OpenAI's LLM to parse and structure the query into searchable parameters.
"""

import json
import re
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any
import openai
from openai import OpenAI


def parse_natural_query(
    query: str,
    openai_client: Optional[OpenAI] = None,
    model: str = "gpt-4o-mini"
) -> Dict[str, Any]:
    """
    Parse a natural language query into structured search parameters.
    
    Args:
        query: Natural language search query (e.g., "music events for kids after 5 pm on saturday")
        openai_client: Optional OpenAI client instance
        model: OpenAI model to use for parsing
        
    Returns:
        Dictionary with parsed parameters:
        {
            "categories": ["Music", "Family & Education"],
            "time_constraints": {
                "after_time": "17:00",
                "day_of_week": "saturday"
            },
            "audience": ["kids", "children", "family"],
            "keywords": ["music"],
            "location_hints": [],
            "price_range": None,
            "date_range": None
        }
    """
    
    client = openai_client or OpenAI()
    
    # Define the system prompt for parsing
    system_prompt = """You are an expert at parsing natural language event search queries into structured data.

Extract the following information from user queries and return as JSON:

1. "categories" - Array of relevant event categories from: ["Music", "Sports & Recreation", "Food & Drink", "Arts & Theatre", "Tech & Innovation", "Business & Networking", "Family & Education", "Community & Culture", "Health & Wellness", "Film & Entertainment"]

2. "time_constraints" - Object with:
   - "after_time": Time in HH:MM format (24-hour) if specified
   - "before_time": Time in HH:MM format (24-hour) if specified  
   - "day_of_week": Day name if specified (lowercase)
   - "time_of_day": "morning", "afternoon", "evening", "night" if specified

3. "audience" - Array of target audience keywords (e.g., ["kids", "adults", "seniors", "families"])

4. "keywords" - Array of important search terms that should be matched in event titles/descriptions

5. "location_hints" - Array of any location-specific terms mentioned

6. "price_range" - Object with "min" and/or "max" if price constraints mentioned, or "free" if free events requested

7. "date_range" - Object with "start_date" and/or "end_date" in YYYY-MM-DD format if specific dates mentioned

Examples:
- "music events for kids after 5 pm on June 21" → categories: ["Music", "Family & Education"], time_constraints: {"after_time": "17:00", "date_range": {"start_date": "2025-06-21", "end_date": "2025-06-21"}}, audience: ["kids"], keywords: ["music"]
- "free outdoor concerts this weekend" → categories: ["Music"], keywords: ["outdoor", "concerts"], price_range: {"free": true}
- "business networking events under $50" → categories: ["Business & Networking"], keywords: ["networking"], price_range: {"max": 50}

Return only valid JSON without any additional text."""

    try:
        response = client.chat.completions.create(
            model=model,
            temperature=0.1,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Parse this event search query: {query}"}
            ]
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Try to parse the JSON response
        try:
            parsed_result = json.loads(result_text)
        except json.JSONDecodeError:
            # Fallback: try to extract JSON from the response
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                parsed_result = json.loads(json_match.group())
            else:
                raise ValueError("Could not parse JSON from LLM response")
                
        # Ensure all required keys exist with defaults
        default_result = {
            "categories": [],
            "time_constraints": {},
            "audience": [],
            "keywords": [],
            "location_hints": [],
            "price_range": None,
            "date_range": None
        }
        
        # Merge parsed result with defaults
        for key, default_value in default_result.items():
            if key not in parsed_result:
                parsed_result[key] = default_value
                
        # Resolve day_of_week to a concrete date_range if not already present
        if "day_of_week" in parsed_result.get("time_constraints", {}) and not parsed_result.get("date_range"):
            day_name = parsed_result["time_constraints"]["day_of_week"]
            resolved_date = _resolve_day_to_date(day_name)
            if resolved_date:
                parsed_result["date_range"] = {
                    "start_date": resolved_date.strftime("%Y-%m-%d"),
                    "end_date": resolved_date.strftime("%Y-%m-%d")
                }
        
        return parsed_result
        
    except Exception as e:
        print(f"Error parsing query with LLM: {e}")
        # Fallback: basic keyword extraction
        return _fallback_parse(query)


def _resolve_day_to_date(day_name: str) -> Optional[date]:
    """
    Resolves a day name (e.g., "saturday") to the next upcoming date for that day.
    """
    days_of_week = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    try:
        target_day_index = days_of_week.index(day_name.lower())
    except ValueError:
        return None # Invalid day name
    
    today = date.today()
    today_index = today.weekday() # Monday is 0, Sunday is 6
    
    # Calculate days until the next target day
    days_until = (target_day_index - today_index + 7) % 7
    
    # If days_until is 0, it means today is the target day.
    # If the query implies "this Saturday" and today is Saturday, we use today.
    # If the query implies "next Saturday" and today is Saturday, we need to add 7 days.
    # For simplicity, let's assume "on Saturday" means the *next* Saturday, including today if it's Saturday.
    
    # If today is the target day, and the query is "on Saturday", it means this Saturday.
    # If today is not the target day, it means the next upcoming target day.
    
    # If days_until is 0, it means today is the target day.
    # If we want the *next* occurrence strictly, we'd add 7 days if days_until is 0.
    # For "on Saturday", it's usually interpreted as the *upcoming* Saturday, which could be today.
    
    # Let's adjust to get the *next* occurrence, including today if it matches.
    # If today is Saturday, and query is "on Saturday", days_until will be 0.
    # The current logic correctly calculates the next occurrence.
    
    next_date = today + timedelta(days=days_until)
    return next_date


def _fallback_parse(query: str) -> Dict[str, Any]:
    """
    Fallback parser using simple keyword matching when LLM fails.
    """
    query_lower = query.lower()
    
    # Basic category mapping
    category_keywords = {
        "Music": ["music", "concert", "band", "singer", "song", "musical"],
        "Sports & Recreation": ["sports", "game", "tournament", "athletic", "fitness", "exercise"],
        "Food & Drink": ["food", "restaurant", "dining", "cooking", "wine", "beer", "cocktail"],
        "Arts & Theatre": ["art", "theatre", "theater", "play", "exhibition", "gallery", "dance"],
        "Family & Education": ["kids", "children", "family", "education", "learning", "school"],
        "Film & Entertainment": ["movie", "film", "cinema", "screening"],
        "Tech & Innovation": ["tech", "technology", "startup", "innovation", "coding", "programming"],
        "Business & Networking": ["business", "networking", "professional", "career", "entrepreneur"],
        "Community & Culture": ["community", "cultural", "festival", "celebration"],
        "Health & Wellness": ["health", "wellness", "yoga", "meditation", "fitness"]
    }
    
    detected_categories = []
    keywords = []
    
    for category, category_words in category_keywords.items():
        for word in category_words:
            if word in query_lower:
                detected_categories.append(category)
                keywords.append(word)
                break
    
    # Extract audience
    audience = []
    audience_keywords = ["kids", "children", "adults", "seniors", "families", "teens", "teenagers"]
    for aud in audience_keywords:
        if aud in query_lower:
            audience.append(aud)
    
    # Extract time constraints
    time_constraints = {}
    
    # Day of week
    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for day in days:
        if day in query_lower:
            time_constraints["day_of_week"] = day
            break
    
    # Time of day
    if "morning" in query_lower:
        time_constraints["time_of_day"] = "morning"
    elif "afternoon" in query_lower:
        time_constraints["time_of_day"] = "afternoon"
    elif "evening" in query_lower:
        time_constraints["time_of_day"] = "evening"
    elif "night" in query_lower:
        time_constraints["time_of_day"] = "night"
    
    # Extract time patterns like "after 5 pm", "before 3pm"
    time_pattern = re.search(r'(after|before)\s+(\d{1,2})\s*(pm|am)', query_lower)
    if time_pattern:
        direction, hour, period = time_pattern.groups()
        hour = int(hour)
        if period == "pm" and hour != 12:
            hour += 12
        elif period == "am" and hour == 12:
            hour = 0
        
        time_key = f"{direction}_time"
        time_constraints[time_key] = f"{hour:02d}:00"
    
    # Price constraints
    price_range = None
    if "free" in query_lower:
        price_range = {"free": True}
        
    # Extract date range
    date_range = None
    today = date.today()
    
    if "today" in query_lower:
        date_range = {"start_date": today.strftime("%Y-%m-%d"), "end_date": today.strftime("%Y-%m-%d")}
    elif "tomorrow" in query_lower:
        tomorrow = today + timedelta(days=1)
        date_range = {"start_date": tomorrow.strftime("%Y-%m-%d"), "end_date": tomorrow.strftime("%Y-%m-%d")}
    elif "this weekend" in query_lower:
        # Find the upcoming Saturday and Sunday
        days_until_saturday = (5 - today.weekday() + 7) % 7 # Saturday is 5
        saturday = today + timedelta(days=days_until_saturday)
        sunday = saturday + timedelta(days=1)
        date_range = {"start_date": saturday.strftime("%Y-%m-%d"), "end_date": sunday.strftime("%Y-%m-%d")}
    elif "next week" in query_lower:
        # Start of next week (Monday) to end of next week (Sunday)
        days_until_next_monday = (7 - today.weekday() + 0) % 7 # Monday is 0
        if days_until_next_monday == 0: # If today is Monday, next Monday is in 7 days
            days_until_next_monday = 7
        next_monday = today + timedelta(days=days_until_next_monday)
        next_sunday = next_monday + timedelta(days=6)
        date_range = {"start_date": next_monday.strftime("%Y-%m-%d"), "end_date": next_sunday.strftime("%Y-%m-%d")}
    else:
        # Try to parse specific dates like "June 21" or "21st June"
        # This is a simplified regex and might need more robustness for real-world dates
        month_names = {
            "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
            "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12
        }
        
        # Pattern for "Month Day" or "Day Month" (e.g., "June 21", "21st June")
        date_pattern = re.search(r'(?:(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?)|(?:(\d{1,2})(?:st|nd|rd|th)?\s+(\w+))', query_lower)
        if date_pattern:
            month_str, day_str, day_str_alt, month_str_alt = date_pattern.groups()
            
            if month_str and day_str:
                month = month_names.get(month_str.lower())
                day = int(day_str)
            elif day_str_alt and month_str_alt:
                month = month_names.get(month_str_alt.lower())
                day = int(day_str_alt)
            else:
                month = None
                day = None
                
            if month and day:
                try:
                    # Assume current year for simplicity, or next year if date has passed
                    target_date = date(today.year, month, day)
                    if target_date < today:
                        target_date = date(today.year + 1, month, day)
                    date_range = {"start_date": target_date.strftime("%Y-%m-%d"), "end_date": target_date.strftime("%Y-%m-%d")}
                except ValueError:
                    pass # Invalid date
    
    return {
        "categories": detected_categories,
        "time_constraints": time_constraints,
        "audience": audience,
        "keywords": keywords,
        "location_hints": [],
        "price_range": price_range,
        "date_range": date_range
    }


def filter_events_by_parsed_query(events: List[Dict], parsed_query: Dict[str, Any]) -> List[Dict]:
    """
    Filter a list of events based on parsed natural language query parameters.
    
    Args:
        events: List of event dictionaries
        parsed_query: Parsed query from parse_natural_query()
        
    Returns:
        Filtered list of events matching the query criteria
    """
    filtered_events = []
    
    for event in events:
        if _event_matches_query(event, parsed_query):
            filtered_events.append(event)
    
    return filtered_events


def _event_matches_query(event: Dict, query: Dict[str, Any]) -> bool:
    """
    Check if a single event matches the parsed query criteria.
    """
    # Check categories
    if query.get("categories"):
        event_category = event.get("details", {}).get("Smart Category", "")
        if event_category not in query["categories"]:
            return False
    
    # Check keywords in title and description
    if query.get("keywords"):
        title = event.get("title", "").lower()
        description = event.get("details", {}).get("Info", "") or ""
        description = description.lower() if description else ""
        
        text_to_search = f"{title} {description}"
        
        # Check if any keyword matches
        keyword_match = any(keyword.lower() in text_to_search for keyword in query["keywords"])
        if not keyword_match:
            return False
    
    # Check audience keywords
    if query.get("audience"):
        title = event.get("title", "").lower()
        description = event.get("details", {}).get("Info", "") or ""
        description = description.lower() if description else ""
        
        text_to_search = f"{title} {description}"
        
        # Check if any audience keyword matches
        audience_match = any(aud.lower() in text_to_search for aud in query["audience"])
        if not audience_match:
            return False
    
    # Check time constraints
    time_constraints = query.get("time_constraints", {})
    if time_constraints and event.get("datetime"):
        event_datetime = event["datetime"]
        
        # Check day of week
        if "day_of_week" in time_constraints:
            required_days = time_constraints["day_of_week"]
            if isinstance(required_days, str): # Handle single string from LLM
                required_days = [required_days.lower()]
            else: # Assume it's a list from manual filters
                required_days = [d.lower() for d in required_days]
                
            event_day = event_datetime.strftime("%A").lower()
            if event_day not in required_days:
                return False
        
        # Check time constraints
        if "after_time" in time_constraints:
            required_time = datetime.strptime(time_constraints["after_time"], "%H:%M").time()
            event_time = event_datetime.time()
            if event_time < required_time:
                return False
                
        if "before_time" in time_constraints:
            required_time = datetime.strptime(time_constraints["before_time"], "%H:%M").time()
            event_time = event_datetime.time()
            if event_time > required_time:
                return False
                
        # Check time of day (morning, afternoon, evening, night)
        if "time_of_day" in time_constraints:
            required_times_of_day = time_constraints["time_of_day"]
            if isinstance(required_times_of_day, str): # Handle single string from LLM
                required_times_of_day = [required_times_of_day.lower()]
            else: # Assume it's a list from manual filters
                required_times_of_day = [t.lower() for t in required_times_of_day]
            
            event_hour = event_datetime.hour
            
            # Check if event_hour falls into any of the required time_of_day categories
            match_found = False
            for req_tod in required_times_of_day:
                if req_tod == "morning": # 5 AM to 11:59 AM
                    if (5 <= event_hour < 12):
                        match_found = True
                        break
                elif req_tod == "afternoon": # 12 PM to 4:59 PM
                    if (12 <= event_hour < 17):
                        match_found = True
                        break
                elif req_tod == "evening": # 5 PM to 8:59 PM
                    if (17 <= event_hour < 21):
                        match_found = True
                        break
                elif req_tod == "night": # 9 PM to 4:59 AM (next day)
                    if (21 <= event_hour or event_hour < 5):
                        match_found = True
                        break
            
            if not match_found:
                return False
                
    # Check date range
    date_range = query.get("date_range")
    if date_range and event.get("datetime"):
        event_date = event["datetime"].date()
        
        if "start_date" in date_range:
            start_date = datetime.strptime(date_range["start_date"], "%Y-%m-%d").date()
            if event_date < start_date:
                return False
                
        if "end_date" in date_range:
            end_date = datetime.strptime(date_range["end_date"], "%Y-%m-%d").date()
            if event_date > end_date:
                return False
    
    # Check price constraints
    price_range = query.get("price_range")
    if price_range:
        if price_range.get("free"):
            # Check if event is free
            event_price = event.get("details", {}).get("Price")
            if event_price and event_price.get("min", 0) > 0:
                return False
    
    return True


if __name__ == "__main__":
    # Test the parser
    test_queries = [
        "music events for kids after 5 pm on saturday",
        "free outdoor concerts this weekend",
        "business networking events under $50",
        "yoga classes in the morning",
        "family friendly activities"
    ]
    
    for query in test_queries:
        print(f"\nQuery: {query}")
        result = parse_natural_query(query)
        print(f"Parsed: {json.dumps(result, indent=2)}")
