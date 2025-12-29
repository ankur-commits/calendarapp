import json
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from .. import models, schemas
import os
from google import genai
from google.genai import types

class AILearningService:
    def __init__(self, db: Session):
        self.db = db
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    def get_user_profile_context(self, user_id: int) -> str:
        """Retrieves active profile attributes for the user."""
        attributes = self.db.query(models.UserProfileAttribute).filter(
            models.UserProfileAttribute.user_id == user_id,
            models.UserProfileAttribute.confidence > 0.5
        ).all()
        
        context_lines = []
        for attr in attributes:
            context_lines.append(f"- {attr.key}: {attr.value} (Confidence: {attr.confidence})")
            
        return "\n".join(context_lines)

    def learn_from_interaction(self, user_id: int, user_input: str, actual_action: Dict[str, Any]):
        """
        Analyzes the discrepancy between what was implied and what actually happened.
        
        Args:
            user_id: The ID of the user.
            user_input: The original natural language query (if available).
            actual_action: The final structured data saved (e.g. event location, shopping item).
        """
        # Example: Learning Location
        if actual_action.get("type") == "event":
            location = actual_action.get("location")
            category = actual_action.get("category", "General")
            
            if location and category:
                # Check if we already have a preference
                existing_attr = self.db.query(models.UserProfileAttribute).filter(
                    models.UserProfileAttribute.user_id == user_id,
                    models.UserProfileAttribute.key == f"location_{category}"
                ).first()
                
                if existing_attr:
                    if existing_attr.value == location:
                        # Reinforce
                        existing_attr.confidence = min(1.0, existing_attr.confidence + 0.1)
                    else:
                        # Conflict - User changed it?
                        # Decrease confidence of old, or replace if confidence low
                        existing_attr.confidence = max(0.0, existing_attr.confidence - 0.2)
                        
                        if existing_attr.confidence < 0.3:
                            existing_attr.value = location
                            existing_attr.confidence = 0.5 # Reset
                else:
                    # New learning
                    new_attr = models.UserProfileAttribute(
                        user_id=user_id,
                        key=f"location_{category}",
                        value=location,
                        confidence=0.5
                    )
                    self.db.add(new_attr)
        
        self.db.commit()

    async def parse_multi_intent(self, user_id: int, query: str) -> Dict[str, Any]:
        """
        Parses a natural language query into multiple intents (Events, Shopping, ToDos)
        using the user's profile context.
        """
        profile_context = self.get_user_profile_context(user_id)
        
        prompt = f"""
        You are a smart family assistant. 
        User Context:
        {profile_context}
        
        User Query: "{query}"
        
        Extract the following intents:
        1. Calendar Events (check context for usual locations/times)
        2. Shopping Items
        3. To-Do Tasks
        
        Return a JSON object with keys: 'events', 'shopping_list', 'todos'.
        
        JSON Schema:
        {{
            "events": [ {{ "title": "...", "start_time": "ISO", "location": "...", "attendees": [...], "category": "..." }} ],
            "shopping_list": [ {{ "name": "...", "category": "General" }} ],
            "todos": [ {{ "title": "...", "due_date": "ISO", "assigned_to": "..." }} ]
        }}
        """
        
        response = self.client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type='application/json'
            )
        )
        
        return json.loads(response.text)
