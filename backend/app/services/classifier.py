import json
import logging
import os
import time
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence
from openai import OpenAI

DEFAULT_MODEL = os.getenv("OPENAI_EVENT_MODEL", "gpt-4o-mini")
DEFAULT_LABELS: Sequence[str] = (
    "Music",
    "Sports & Recreation",
    "Food & Drink",
    "Arts & Theatre",
    "Tech & Innovation",
    "Business & Networking",
    "Family & Education",
    "Community & Culture",
    "Health & Wellness",
    "Film & Entertainment",
)

def classify_event(
    event: Dict[str, str],
    *,
    labels: Sequence[str] | None = None,
    model: str | None = None,
    openai_client: OpenAI | None = None,
    max_retries: int = 3,
) -> str:
    
    client = openai_client or OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    label_instructions = (
        "Choose a single category from this list: \n- "
        + "\n- ".join(labels or DEFAULT_LABELS)
        + "\nIf no suitable category exists, respond with 'Other'."
    )
    
    prompt = (
        "Event title: "
        + event.get("title", "(none)")
        + "\n\n"
        "Event description: "
        + (event.get("description", "(none)")[:8000])
        + "\n\n"
        + label_instructions
        + "\nRespond with JUST the category name."
    )

    for attempt in range(max_retries):
        try:
            completion = client.chat.completions.create(
                model=model or DEFAULT_MODEL,
                temperature=0.0,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a short, highly accurate event categorisation engine. "
                            "Always respond with exactly one category name."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            category = completion.choices[0].message.content.strip()
            return category
        except Exception as exc:
            sleep_for = 2 ** attempt
            time.sleep(sleep_for)
            
    return "Other"
