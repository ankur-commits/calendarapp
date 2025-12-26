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
    from google import genai
    from google.genai import types
    
    # Initialize Client
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    try:
        # Construct a detailed system prompt
        system_instruction = """
        You are a helpful event planning assistant for a family.
        Your goal is to find REAL events based on the user's query.
        
        CRITICAL INSTRUCTIONS:
        1.  **USE GOOGLE SEARCH**: You MUST use the Google Search tool to find and VALIDATE events. Do not hallucinate.
        2.  **VERIFY DETAILS**: For every event, verify the date, time, location, and ticket availability.
        3.  **TICKET LINKS**: You MUST include a direct link to purchase tickets or the official event page.
        4.  **JSON ONLY**: Your output MUST be a valid JSON object matching the schema below. Do not output markdown formatting (like ```json), just the raw JSON.
        
        JSON SCHEMA:
        {
            "suggestions": [
                {
                    "title": "Event Title",
                    "description": "Short description. Include the ticket link here if 'ticket_url' field is not enough.",
                    "start_time": "ISO 8601 format (YYYY-MM-DDTHH:MM:SS)",
                    "end_time": "ISO 8601 format or null",
                    "location": "Venue Name, City, State",
                    "budget_estimate": "e.g., '$50 per person'",
                    "travel_time_minutes": 30,
                    "category": "Concert/Sports/etc.",
                    "suggested_attendees": ["Family"],
                    "reasoning": "Why is this a good fit?",
                    "ticket_url": "https://url.to.tickets"
                }
            ]
        }
        """
        
        full_prompt = f"{system_instruction}\n\nUser Query: {request.query}"
        prompt = full_prompt
        # Generate content with Google Search tool enabled
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
        )
        
        # Extract text response
        result_text = response.text
        print(f"DEBUG: Gemini raw response: {result_text}")
        
        # Parse JSON
        # Clean markdown code blocks if present
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
            
        print(f"DEBUG: Extracted JSON text: {result_text}")
        if not result_text:
             raise ValueError("Empty response from model after cleanup")

        data = json.loads(result_text)
        
        # Basic validation
        final_suggestions = []
        for item in data.get("suggestions", []):
            # Ensure description contains the link if ticket_url is present, for UI visibility
            url = item.get("ticket_url")
            desc = item.get("description", "")
            if url and "http" in url:
               item["description"] = f"{desc}\n\n[Buy Tickets]({url})"
            
            final_suggestions.append(item)
            
        return {"suggestions": final_suggestions}

    except Exception as e:
        print(f"Error in Gemini search: {e}")
        # For now, just raise 500
        raise HTTPException(status_code=500, detail=str(e))
