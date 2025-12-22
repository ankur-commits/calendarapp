"""
llm_classifier.py
-----------------
Reusable helper module that adds free‑form, LLM‑powered categorisation to your event
pipeline.  Import it anywhere in your Streamlit app or scraper code to classify one
or more event dictionaries *without* cluttering business logic with OpenAI plumbing.

Usage Example
-------------
>>> from llm_classifier import classify_event
>>> label = classify_event({
        "title": "Twilight Pickleball – beginners welcome!",
        "description": "Join us for a fun evening round‑robin at Perrigo Park..."
    })
>>> print(label)
"Sports & Recreation"

Configuration
-------------
Set your OpenAI key via the environment variable ``OPENAI_API_KEY`` *or* pass an
``openai_client`` that already has credentials configured (useful inside
Streamlit when you prefer ``st.secrets["OPENAI_API_KEY"]``).

The default taxonomy is deliberately short and human‑readable.  Override it by
passing a ``labels`` list to the classify functions *or* tweak ``DEFAULT_LABELS``
below.
"""
from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence

import openai
from openai import OpenAI
from openai._types import NotGiven
from openai.types.chat import ChatCompletion

# ---------------------------------------------------------------------------
# Configuration & cache
# ---------------------------------------------------------------------------

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

_CACHE_FILE = Path(os.getenv("EVENT_CLASS_CACHE", "./.event_class_cache.json"))
_CACHE: Dict[str, str] = {}
if _CACHE_FILE.exists():
    try:
        _CACHE.update(json.loads(_CACHE_FILE.read_text()))
    except json.JSONDecodeError:
        logging.warning("Could not read cache file %s – starting fresh", _CACHE_FILE)


def _persist_cache() -> None:
    """Persist the local in‑memory cache to disk."""
    try:
        _CACHE_FILE.write_text(json.dumps(_CACHE, ensure_ascii=False, indent=2))
    except OSError as ex:
        logging.warning("Failed to write event classification cache: %s", ex)


# ---------------------------------------------------------------------------
# Prompt helpers
# ---------------------------------------------------------------------------

def _format_prompt(event: Dict[str, str], labels: Sequence[str] | None) -> str:
    label_instructions = (
        "Choose a single category from this list: \n- "
        + "\n- ".join(labels or DEFAULT_LABELS)
        + "\nIf no suitable category exists, respond with 'Other'."
    )
    return (
        "Event title: "
        + event.get("title", "(none)")
        + "\n\n"
        "Event description: "
        + (event.get("description", "(none)")[:8000])  # model input limit guard
        + "\n\n"
        + label_instructions
        + "\nRespond with JUST the category name."
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_event(
    event: Dict[str, str],
    *,
    labels: Sequence[str] | None = None,
    model: str | None = None,
    openai_client: OpenAI | None = None,
    use_cache: bool = True,
    max_retries: int = 3,
) -> str:
    """Classify a single event dict and return a category string.

    Parameters
    ----------
    event : dict
        Must contain at least ``title`` and ``description`` keys.
    labels : list[str], optional
        Custom taxonomy to choose from; falls back to ``DEFAULT_LABELS``.
    model : str, optional
        Override the chat model name.  Defaults to ``DEFAULT_MODEL``.
    openai_client : openai.OpenAI, optional
        If supplied, this client instance will be used for API calls; otherwise a
        new one is created from ``OPENAI_API_KEY``.
    use_cache : bool
        Enable simple on‑disk caching (default True).
    max_retries : int
        How many times to retry transient API errors.
    """
    key = (event.get("title", "") + "|" + event.get("description", "")).strip()
    if use_cache and key in _CACHE:
        return _CACHE[key]

    client = openai_client or OpenAI()
    prompt = _format_prompt(event, labels)

    last_err: Exception | None = None
    for attempt in range(max_retries):
        try:
            completion: ChatCompletion | NotGiven = client.chat.completions.create(
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
            if use_cache:
                _CACHE[key] = category
                _persist_cache()
            return category
        except Exception as exc:  # pragma: no cover – broad but explicit retries
            last_err = exc
            sleep_for = 2 ** attempt
            logging.warning(
                "OpenAI classify attempt %d/%d failed (%s). Retrying in %ds...", 
                attempt + 1,
                max_retries,
                type(exc).__name__,
                sleep_for,
            )
            time.sleep(sleep_for)
    # If we reach here, raise the last error
    raise RuntimeError("Failed to classify event after retries") from last_err


def classify_events(
    events: Iterable[Dict[str, str]],
    *,
    labels: Sequence[str] | None = None,
    model: str | None = None,
    openai_client: OpenAI | None = None,
    progress_callback: Optional[callable[[int, int], None]] = None,
) -> List[str]:
    """Batch classify an iterable of event dicts.  Returns a list of categories.

    The order of returned categories matches the input order.
    """
    client = openai_client or OpenAI()
    categories: List[str] = []
    total = len(events) if hasattr(events, "__len__") else None

    for idx, evt in enumerate(events):
        cat = classify_event(
            evt,
            labels=labels,
            model=model,
            openai_client=client,
        )
        categories.append(cat)
        if progress_callback and total is not None:
            progress_callback(idx + 1, total)
    return categories


# ---------------------------------------------------------------------------
# __main__ utility for quick CLI tests
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Classify an event with the OpenAI chat model")
    parser.add_argument("title", help="Event title")
    parser.add_argument("description", help="Event description")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="OpenAI model name – default: %(default)s")
    args = parser.parse_args()

    category_name = classify_event({"title": args.title, "description": args.description}, model=args.model)
    print(category_name)
    