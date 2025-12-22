from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models
from pydantic import BaseModel
from openai import OpenAI
import os
import json
from datetime import datetime, date
from ..services.ticketmaster import TicketmasterService

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    user_id: Optional[int] = None

class EventSuggestion(BaseModel):
    title: str
    description: str
    start_time: str # ISO format
    end_time: str # ISO format
    location: str
    budget_estimate: str
    travel_time_minutes: int
    category: str
    suggested_attendees: List[str] # List of names from the family
    reasoning: str # Why this event?

class SearchResponse(BaseModel):
    suggestions: List[EventSuggestion]

@router.post("/search", response_model=SearchResponse)
async def search_events(request: SearchRequest = Body(...), db: Session = Depends(get_db)):
    """
    AI Assistant endpoint to search/generate event ideas using Google Gemini with Search Grounding.
    """
    import google.generativeai as genai
    from google.protobuf.json_format import MessageToDict
    
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    
    # Use Gemini Flash Latest for valid model name
    model = genai.GenerativeModel('models/gemini-flash-latest')
    
    # Fetch available users to help with attendee suggestions
    users = db.query(models.User).all()
    
    # Create rich user context with addresses
    user_context_parts = []
    for u in users:
        base_info = u.name
        if u.preferences and u.preferences.get("address"):
            base_info += f" (Lives at: {u.preferences.get('address')})"
        user_context_parts.append(base_info)
    
    user_context = ", ".join(user_context_parts)
    
    today_str = date.today().strftime("%Y-%m-%d")
    
    # Single Prompt Approach: Ask Gemini to search and format
    prompt = f"""
    You are an intelligent family calendar assistant.
    Current Date: {today_str}
    Available Family Members: {user_context}
    
    User Query: "{request.query}"
    
    Task:
    1. SEARCH for real-world events matching the query (concerts, movies, shows, local activities) using Google Search.
    2. STRICTLY FILTER for events occurring AFTER {today_str}. Do NOT return past events.
    3. VALIDATE existence: Use Google Search to confirm the event is confirmed and tickets/details are available.
    4. If the query is generic (e.g. "dinner ideas"), generate creative suggestions (ensure they are open/available).
    5. Return a list of 8-10 distinct event suggestions in JSON format. Including multiple times for the same event is allowed.
    
    For each event, provide:
    - title: Specific name of event/activity
    - description: Brief description (include venue/context). Mention if it involves travel.
    - start_time: ISO8601 string (MUST be in the future relative to {today_str})
    - end_time: ISO8601 string
    - location: Specific address or venue name
    - budget_estimate: e.g. "$50-100", "Free"
    - travel_time_minutes: Estimate derived from location (default 30)
    - category: One of [Music, Sports, Food, Arts, Family, General]
    - suggested_attendees: List of family members likely interested
    - reasoning: Why this match?
    - ticket_url: URL to buy tickets or official event page (extracted from search results)
    
    Return pure JSON:
    {{
        "suggestions": [
            {{ ... }}
        ]
    }}
    """
    
    try:
        # Generate content with Google Search tool enabled
        tool = genai.protos.Tool(google_search=genai.protos.Tool.GoogleSearch())
        response = model.generate_content(
            prompt,
            tools=[tool]
        )
        
        # Extract text response
        result_text = response.text
        
        # Parse JSON
        # Clean markdown code blocks if present
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
            
        data = json.loads(result_text)
        
        # Post-process: ground with source URLs if missing in JSON but present in grounding metadata
        # (Gemini often puts links in the text, but we asked for JSON 'ticket_url')
        # If 'ticket_url' is missing/empty, we can try to inspect grounding_metadata, 
        # but usually Gemini 1.5 is good at extracting it into the JSON if requested.
        
        # However, to capture the exact "Buy" link from grounding might be complex if not in JSON.
        # Let's trust the model to put it in 'ticket_url' as requested.
        
        # Basic validation
        final_suggestions = []
        for item in data.get("suggestions", []):
            # Ensure description contains the link if ticket_url is present, for UI visibility
            url = item.get("ticket_url")
            desc = item.get("description", "")
            if url and "http" in url:
               # We can embed it in description for the frontend to render (if it supports HTML/Markdown)
               # OR we rely on the frontend having a "Buy Tickets" button.
               # The current EventAssistant UI generates "Add to Calendar". 
               # We can append the link to description so it saves in the calendar event.
               item["description"] = f"{desc}\n\n[Buy Tickets]({url})"
            
            final_suggestions.append(item)
            
        return {"suggestions": final_suggestions}

    except Exception as e:
        print(f"Error in Gemini search: {e}")
        # Fallback to Ticketmaster/Creative check or just error
        # Reverting to basic Ticketmaster if Gemini fails?
        # For now, just raise 500
        raise HTTPException(status_code=500, detail=str(e))
