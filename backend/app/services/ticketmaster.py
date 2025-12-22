import requests
from datetime import datetime, timedelta
import os
from dateutil import parser

class TicketmasterService:
    def __init__(self):
        self.api_key = os.getenv("TICKETMASTER_API_KEY")
        self.base_url = "https://app.ticketmaster.com/discovery/v2/events.json"

    def search_events(self, keyword=None, city="Seattle", radius=50, classification_name=None):
        if not self.api_key:
            print("Warning: TICKETMASTER_API_KEY not set")
            return []

        # Default to next 14 days
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=14)

        params = {
            "apikey": self.api_key,
            "keyword": keyword,
            "radius": radius,
            "unit": "km",
            "locale": "*",
            "startDateTime": start_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "endDateTime": end_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sort": "date,asc",
            "city": city,
            "size": 10  # Limit results
        }
        
        if classification_name:
            params["classificationName"] = classification_name

        try:
            response = requests.get(self.base_url, params=params)
            if response.status_code != 200:
                print(f"Ticketmaster API Error: {response.status_code} {response.text}")
                return []
            
            data = response.json()
            events = data.get("_embedded", {}).get("events", [])
            return self._format_events(events)
            
        except Exception as e:
            print(f"Error fetching Ticketmaster events: {e}")
            return []

    def _format_events(self, tm_events):
        formatted = []
        for event in tm_events:
            try:
                # Extract basic details
                name = event.get("name", "Unknown Event")
                url = event.get("url", "")
                
                # Image
                images = event.get("images", [])
                image_url = images[0]["url"] if images else ""
                
                # Venue
                venues = event.get("_embedded", {}).get("venues", [{}])
                venue = venues[0]
                venue_name = venue.get("name", "Unknown Venue")
                city = venue.get("city", {}).get("name", "")
                full_location = f"{venue_name}, {city}"
                
                # Date
                dates = event.get("dates", {}).get("start", {})
                date_str = dates.get("dateTime") or dates.get("localDate")
                
                # Price
                price_ranges = event.get("priceRanges", [])
                if price_ranges:
                    min_price = price_ranges[0].get("min", 0)
                    max_price = price_ranges[0].get("max", 0)
                    currency = price_ranges[0].get("currency", "USD")
                    budget = f"${min_price}-{max_price} {currency}"
                else:
                    budget = "Check URL"

                # Category
                classifications = event.get("classifications", [{}])
                category = classifications[0].get("segment", {}).get("name", "General")
                
                # Construct EventSuggestion compatible dict
                formatted.append({
                    "title": name,
                    "description": f"Real event at {venue_name}. <a href='{url}' target='_blank'>Buy Tickets</a>",
                    "start_time": date_str, # ISO string
                    "end_time": date_str, # Ticketmaster often doesn't give end time, reuse start
                    "location": full_location,
                    "budget_estimate": budget,
                    "travel_time_minutes": 30, # Placeholder
                    "category": category,
                    "suggested_attendees": [], # Context aware fill later
                    "reasoning": f"Found matching event on Ticketmaster: {name}"
                })
            except Exception as e:
                print(f"Error parsing event {event.get('name')}: {e}")
                continue
                
        return formatted
