from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from openai import OpenAI
import os
import shutil
import requests
from pathlib import Path
from ..services.nlp import parse_natural_query, parse_voice_command

router = APIRouter()

@router.post("/process")
async def process_voice(
    file: UploadFile = File(...),
):
    """
    Process an audio file:
    1. Save temp file
    2. Delegate to NLP service for transcription (mock or real) and parsing
    3. Return structured data (events, chores, shopping)
    """
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Save temp file
    temp_file = Path(f"temp_{file.filename}")
    try:
        with temp_file.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Call service
        parsed_data = parse_voice_command(str(temp_file), openai_client=client)
        
        return {
            "status": "success",
            "parsed_data": parsed_data
        }
        
    except Exception as e:
        print(f"ERROR: General failure in process_voice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file.exists():
            temp_file.unlink()
