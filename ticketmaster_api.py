import requests
from datetime import datetime, timedelta

def fetch_ticketmaster_events(api_key, location="Sammamish, WA", radius_km=25, days_ahead=7):
    base_url = "https://app.ticketmaster.com/discovery/v2/events.json"

    # Define date range
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=days_ahead)

    params = {
        "apikey": api_key,
        "keyword": "",
        "radius": radius_km,
        "unit": "km",
        "locale": "*",
        "startDateTime": start_date.isoformat(timespec='seconds') + "Z",
        "endDateTime": end_date.isoformat(timespec='seconds') + "Z",
        "sort": "date,asc",
        "city": location.split(",")[0]  # Extract city name only
    }

    response = requests.get(base_url, params=params)

    if response.status_code != 200:
        return f"Error fetching events: {response.status_code} {response.text}"

    data = response.json()
    return data.get("_embedded", {}).get("events", [])

# ticketmaster_api.py

# New function to format the events
def format_ticketmaster_events(tm_events, selected_categories):
    formatted_events = []

    for event in tm_events:
        classifications = event.get("classifications", [])
        segment_name = classifications[0].get("segment", {}).get("name") if classifications else None
        if segment_name not in selected_categories:
            continue

        date_str = event['dates']['start'].get('dateTime') or event['dates']['start'].get('localDate')
        event_datetime = None
        if date_str:
            try:
                event_datetime = datetime.fromisoformat(date_str.replace("Z", ""))
            except Exception:
                event_datetime = None

        formatted_events.append({
            "source": "Ticketmaster",
            "datetime": event_datetime,
            "title": event["name"],
            "url": event.get("url", "https://ticketmaster.com"),
            "location": ", ".join(filter(None, [
                event.get("_embedded", {}).get("venues", [{}])[0].get("address", {}).get("line1", ""),
                event.get("_embedded", {}).get("venues", [{}])[0].get("city", {}).get("name", ""),
                event.get("_embedded", {}).get("venues", [{}])[0].get("state", {}).get("name", "")
            ])),
            "details": {
                "Promoter": event.get("promoter", {}).get("name", "N/A"),
                "Price": event.get("priceRanges", [{}])[0] if event.get("priceRanges") else None,
                "Info": event.get("info")
            }
        })

    return formatted_events