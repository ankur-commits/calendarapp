import streamlit as st
from datetime import datetime, timedelta
from typing import Optional # Import Optional for type hinting
from ticketmaster_api import fetch_ticketmaster_events, format_ticketmaster_events
from eventbrite_scraper import scrape_eventbrite_local
import requests
from bs4 import BeautifulSoup
import re # Import re for regex operations in date parsing
# --- Sidebar Inputs ---
from llm_classifier import classify_event, DEFAULT_LABELS   # move to top
from nlp_query_parser import parse_natural_query, filter_events_by_parsed_query

import openai

def _parse_event_datetime(date_str: str, current_year: int) -> Optional[datetime]:
    """
    Attempts to parse various date/time string formats into a datetime object.
    Handles formats like:
    - "Sat, Jun 22, 2025 10:00 AM PDT"
    - "Saturday, June 22, 2025"
    - "June 22, 2025 7:00 PM"
    - "Today at 7:00 PM"
    - "Tomorrow at 10:00 AM"
    - "This Saturday at 2:00 PM"
    - "Thu, Jun 22" (assumes current year)
    """
    date_str_lower = date_str.lower()
    today = datetime.today()
    
    # Handle "Today" and "Tomorrow"
    if "today" in date_str_lower:
        date_part = today.date()
    elif "tomorrow" in date_str_lower:
        date_part = (today + timedelta(days=1)).date()
    else:
        date_part = None

    # Try to parse with common formats
    parse_formats = [
        "%a, %b %d, %Y %I:%M %p %Z", # Sat, Jun 22, 2025 10:00 AM PDT
        "%A, %B %d, %Y %I:%M %p",    # Saturday, June 22, 2025 10:00 AM
        "%B %d, %Y %I:%M %p",        # June 22, 2025 7:00 PM
        "%a, %b %d",                 # Thu, Jun 22 (assume current year)
        "%A, %B %d",                 # Thursday, June 22 (assume current year)
        "%B %d",                     # June 22 (assume current year)
        "%a, %b %d %I:%M %p",        # Sat, Jun 22 10:00 AM (assume current year)
        "%A, %B %d %I:%M %p",        # Saturday, June 22 10:00 AM (assume current year)
    ]

    parsed_dt = None
    
    # If date_part was resolved (Today/Tomorrow), try to get time from string
    if date_part:
        time_match = re.search(r'at (\d{1,2}(?::\d{2})?\s*(?:am|pm))', date_str_lower)
        if time_match:
            time_str = time_match.group(1)
            try:
                # Convert 12-hour to 24-hour
                dt_obj_with_time = datetime.strptime(time_str, "%I:%M %p")
                parsed_dt = datetime.combine(date_part, dt_obj_with_time.time())
            except ValueError:
                try:
                    dt_obj_with_time = datetime.strptime(time_str, "%I %p")
                    parsed_dt = datetime.combine(date_part, dt_obj_with_time.time())
                except ValueError:
                    pass
        if not parsed_dt: # If no time found, just use the date part
            parsed_dt = datetime.combine(date_part, datetime.min.time())
        return parsed_dt

    # Try parsing with explicit formats
    for fmt in parse_formats:
        try:
            # For formats without year, assume current year
            if "%Y" not in fmt:
                temp_date_str = f"{date_str} {current_year}" if "%I" not in fmt else date_str # Add year if not present
                parsed_dt = datetime.strptime(temp_date_str, fmt.replace("%b %d", "%b %d, %Y").replace("%B %d", "%B %d, %Y"))
            else:
                parsed_dt = datetime.strptime(date_str, fmt)
            return parsed_dt
        except ValueError:
            continue
            
    # Fallback for "Day, Month Day" without year, e.g., "Saturday, June 22"
    day_month_day_match = re.search(r'(\w+),\s*(\w+)\s+(\d{1,2})', date_str, re.IGNORECASE)
    if day_month_day_match:
        try:
            month_name = day_month_day_match.group(2)
            day_num = int(day_month_day_match.group(3))
            # Construct a date string with current year and try to parse
            temp_date_str = f"{month_name} {day_num}, {current_year}"
            parsed_dt = datetime.strptime(temp_date_str, "%B %d, %Y")
            return parsed_dt
        except ValueError:
            pass

    return None

# set the openai api key
openai.api_key = st.secrets["OPENAI_API_KEY"]


# set the openai api key
openai.api_key = st.secrets["OPENAI_API_KEY"]

# --- Set your Ticketmaster API Key here ---
TICKETMASTER_API_KEY = st.secrets["TICKETMASTER_API_KEY"]  # Use Streamlit secrets

# Set page configuration
st.set_page_config(
    page_title="Family Activity Planner",
    page_icon="🎟️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Sidebar Inputs ---
location = st.sidebar.text_input("Enter location (City, State or ZIP):", value="Redmond, WA")
days = st.sidebar.slider("Search events happening in next how many days?", 1, 30, 7)

# --- Date/Time Filters ---
st.sidebar.header("🗓️ Date & Time Filters")

# Date Range
col1, col2 = st.sidebar.columns(2)
with col1:
    start_date_filter = st.date_input("Start Date", value=datetime.today().date())
with col2:
    end_date_filter = st.date_input("End Date", value=datetime.today().date() + timedelta(days=days-1))

# Day of Week
day_of_week_options = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
selected_days_filter = st.sidebar.multiselect(
    "Select Day(s) of Week",
    options=day_of_week_options
)

# Time of Day
time_of_day_options = ["Morning", "Afternoon", "Evening", "Night"]
selected_time_of_day_filter = st.sidebar.multiselect(
    "Select Time of Day",
    options=time_of_day_options
)

# --- Natural Language Search ---
st.sidebar.header("🔍 Smart Search")
search_query = st.sidebar.text_input(
    "Describe what you're looking for:",
    placeholder="e.g., music events for kids after 5 pm on saturday",
    help="Use natural language to describe the events you want to find"
)
use_smart_search = st.sidebar.checkbox("Use smart search instead of category filters", value=False)

# --- Category Filters ---
if not use_smart_search:
    st.sidebar.header("🎯 Category Filters")
    category_choices = list(DEFAULT_LABELS)                     # ← replace hard‑coded list
    selected_categories = st.sidebar.multiselect(
        "Select one or more categories to filter:",
        options=category_choices,
        default=category_choices
    )
else:
    selected_categories = list(DEFAULT_LABELS)  # Use all categories for smart search

# --- Main Content ---
st.title("🎟️ Local Events Finder (Ticketmaster + Eventbrite)")

if st.sidebar.button("Find Events"):
    # Parse natural language query if smart search is enabled
    parsed_query = None
    if use_smart_search and search_query.strip():
        with st.spinner("Parsing your search query..."):
            try:
                client = openai.OpenAI(api_key=st.secrets["OPENAI_API_KEY"])
                parsed_query = parse_natural_query(search_query, openai_client=client)
                
                # Display parsed query for user feedback
                st.info(f"🧠 **Understood your search as:**")
                if parsed_query.get("categories"):
                    st.write(f"📂 Categories: {', '.join(parsed_query['categories'])}")
                if parsed_query.get("keywords"):
                    st.write(f"🔍 Keywords: {', '.join(parsed_query['keywords'])}")
                if parsed_query.get("audience"):
                    st.write(f"👥 Audience: {', '.join(parsed_query['audience'])}")
                if parsed_query.get("time_constraints"):
                    constraints = []
                    tc = parsed_query["time_constraints"]
                    if tc.get("day_of_week"):
                        constraints.append(f"on {tc['day_of_week']}")
                    if tc.get("after_time"):
                        constraints.append(f"after {tc['after_time']}")
                    if tc.get("before_time"):
                        constraints.append(f"before {tc['before_time']}")
                    if tc.get("time_of_day"):
                        constraints.append(f"in the {tc['time_of_day']}")
                    if constraints:
                        st.write(f"⏰ Time: {', '.join(constraints)}")
                if parsed_query.get("price_range"):
                    if parsed_query["price_range"].get("free"):
                        st.write("💰 Price: Free events only")
                    elif parsed_query["price_range"].get("max"):
                        st.write(f"💰 Price: Under ${parsed_query['price_range']['max']}")
                        
            except Exception as e:
                st.error(f"Error parsing search query: {e}")
                parsed_query = None

    with st.spinner("Fetching events from Ticketmaster and Eventbrite..."):
        tm_events = fetch_ticketmaster_events(TICKETMASTER_API_KEY, location=location, days_ahead=days)
        
        # Uncommenting the Eventbrite scraping call
        eb_events = scrape_eventbrite_local(location=location)

    if isinstance(tm_events, str):
        st.error(tm_events)
        tm_events = []

    # Uncommenting the Eventbrite error handling
    if isinstance(eb_events, str):
        st.error(eb_events)
        eb_events = []

    # Use the new function to format Ticketmaster events
    all_events = format_ticketmaster_events(tm_events, selected_categories)

    # Process Eventbrite events
    for event in eb_events:
         # 1️⃣  Build a minimal dict for the LLM – title + description are enough
        llm_input = {
            "title": event["title"],
            "description": event.get("description", "")         # scraper may or may not have it
        }
         # 2️⃣  Ask the classifier (cached; ~100 ms per *new* event)
        try:
            smart_cat = classify_event(llm_input)               # returns e.g. "Sports & Recreation"
        except Exception as exc:
            smart_cat = "Other"                                 # fail‑safe
            st.warning(f"LLM classification failed: {exc}")

        # 3️⃣  Respect the sidebar filters (only if not using smart search)
        if not use_smart_search and smart_cat not in selected_categories:
            continue
            
        event_datetime = _parse_event_datetime(event["date"], datetime.today().year)
        
        all_events.append({
            "source": "Eventbrite",
            "datetime": event_datetime, # Now correctly parsed
            "title": event["title"],
            "url": event["url"],
            "location": location,
            "details": {
                "Smart Category": smart_cat # Removed "Date" as datetime is now primary
            }
        })

    # Prepare manual filters
    manual_filters = {
        "time_constraints": {},
        "date_range": {}
    }

    # Apply date range filter
    if start_date_filter and end_date_filter:
        manual_filters["date_range"]["start_date"] = start_date_filter.strftime("%Y-%m-%d")
        manual_filters["date_range"]["end_date"] = end_date_filter.strftime("%Y-%m-%d")
    
    # Apply day of week filter
    if selected_days_filter:
        # Convert selected days to lowercase for consistency with nlp_query_parser
        manual_filters["time_constraints"]["day_of_week"] = [d.lower() for d in selected_days_filter]

    # Apply time of day filter
    if selected_time_of_day_filter:
        # Convert selected times to lowercase
        manual_filters["time_constraints"]["time_of_day"] = [t.lower() for t in selected_time_of_day_filter]

    # Determine the final query to use for filtering
    final_query_for_filtering = {}
    if use_smart_search and parsed_query and search_query.strip():
        # Start with parsed query from LLM
        final_query_for_filtering = parsed_query
        
        # Merge time_constraints and date_range from manual filters, overriding LLM if present
        if manual_filters["time_constraints"]:
            final_query_for_filtering["time_constraints"].update(manual_filters["time_constraints"])
        if manual_filters["date_range"]:
            final_query_for_filtering["date_range"].update(manual_filters["date_range"])
            
    elif manual_filters["time_constraints"] or manual_filters["date_range"]:
        # If smart search is not used, use only manual filters
        final_query_for_filtering = manual_filters
        
    # Apply filtering if any filters are active
    if final_query_for_filtering:
        with st.spinner("Filtering events based on your criteria..."):
            # Need to adjust filter_events_by_parsed_query to handle lists for day_of_week and time_of_day
            # For now, if multiple days/times are selected, it will only match if ALL are true, which is not desired.
            # The current _event_matches_query expects single values for day_of_week and time_of_day.
            # I need to modify _event_matches_query to handle lists for these.
            
            # For now, I will pass the final_query_for_filtering as is, and address the list handling in nlp_query_parser.py next.
            all_events = filter_events_by_parsed_query(all_events, final_query_for_filtering)

    # --- Sort events by datetime when possible ---
    all_events.sort(key=lambda x: x["datetime"] or datetime.max)

    if not all_events:
        if use_smart_search and search_query.strip():
            st.info("No events found matching your search criteria. Try adjusting your search terms or using broader keywords.")
        else:
            st.info("No events found matching your criteria.")
    else:
        search_type = "smart search" if use_smart_search and search_query.strip() else "category filters"
        st.success(f"Found {len(all_events)} event(s) using {search_type}")
        
        for event in all_events:
            with st.container():
                st.subheader(f"{event['title']} ({event['source']})")
                if event["datetime"]:
                    st.write(f"🗓️ Date & Time: {event['datetime'].strftime('%A, %B %d, %Y %I:%M %p')}")
                else: # Fallback for Eventbrite if datetime parsing failed
                    st.write(f"🗓️ Date: {event['details'].get('Date', 'N/A')}") # Use original date string if datetime is None
                st.write(f"📍 Location: {event['location']}")
                smart_category = event['details'].get('Smart Category', 'N/A')
                st.write(f"🎯 Smart Category: {smart_category}")
                st.markdown(f"🔗 [Event Link]({event['url']})")

                # Additional details
                for label, value in event["details"].items():
                    if label == "Price" and value:
                        min_price = value.get("min")
                        max_price = value.get("max")
                        currency = value.get("currency")
                        if min_price and max_price:
                            st.write(f"💵 Price Range: {min_price} - {max_price} {currency}")
                        elif min_price:
                            st.write(f"💵 Price: {min_price} {currency}")
                        elif max_price:
                            st.write(f"💵 Price: {max_price} {currency}")
                    elif label not in ("Price", "Date", "Smart Category"):
                        st.write(f"{label}: {value}")

                st.markdown("---")

# --- Instructions ---
st.markdown("""
### How to use Smart Search:
- **Traditional search**: Uncheck "Use smart search" and select categories manually
- **Smart search**: Check "Use smart search" and describe what you're looking for in natural language

**Smart search examples:**
- "music events for kids after 5 pm on saturday"
- "free outdoor concerts this weekend"
- "business networking events under $50"
- "yoga classes in the morning"
- "family friendly activities"
- "tech meetups on weekdays"
""")
