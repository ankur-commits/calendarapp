import requests
from datetime import datetime, timedelta

API_KEY = "CYU2YP6NYLSD6UOEAY"  # Replace this

base_url = "https://www.eventbriteapi.com/v3/events/search"
headers = {
    "Authorization": f"Bearer {API_KEY}"
}

# Define time range
start_date = datetime.utcnow()
end_date = start_date + timedelta(days=7)

params = {
    "location.address": "Sammamish, WA",
    "location.within": "25km",
    "start_date.range_start": start_date.isoformat() + "Z",
    "start_date.range_end": end_date.isoformat() + "Z",
    "sort_by": "date",
    "expand": "venue"
}

response = requests.get(base_url, headers=headers, params=params)

print(f"Status Code: {response.status_code}")
print("Response Text:")
print(response.text)
