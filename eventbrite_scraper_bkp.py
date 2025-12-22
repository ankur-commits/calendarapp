
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime

def scrape_eventbrite_local(location="Redmond", days=7):
    # Hardcoding the location to Redmond
    formatted_location = "redmond"
    base_url = f"https://www.eventbrite.com/d/wa--{formatted_location}/all-events/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(base_url, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        return f"Error fetching Eventbrite page: {e}"

    soup = BeautifulSoup(response.text, "lxml")
    event_cards = soup.select("div.event-card")

    if not event_cards:
        return []

    events = []
    for card in event_cards:
        try:
            link_tag = card.select_one("a.event-card-link")
            title_tag = link_tag.find("h3") if link_tag else None
            title = title_tag.get_text(strip=True) if title_tag else "No title"
            url = link_tag['href'] if link_tag and link_tag.get("href") else ""

            details_section = card.select_one("section.event-card-details")
            if not details_section:
                continue

            h3_tag = details_section.find("h3")
            p_tags = []
            if h3_tag:
                for sibling in h3_tag.find_all_next("p"):
                    if sibling.find_parent("aside") is None:
                        p_tags.append(sibling)
                    if len(p_tags) >= 2:
                        break

            datetime_str = p_tags[0].get_text(strip=True) if len(p_tags) > 0 else "No date"
            location_str = p_tags[1].get_text(strip=True) if len(p_tags) > 1 else "No location"

            price_tag = card.select_one("div.DiscoverHorizontalEventCard-module__priceWrapper___3rOUY p")
            price = price_tag.get_text(strip=True) if price_tag else "Free or No price info"

            img_tag = card.select_one("img.event-card-image")
            image_url = img_tag['src'] if img_tag and img_tag.get("src") else ""

            events.append({
                "title": title,
                "date": datetime_str,
                "location": location_str,
                "price": price,
                "image_url": image_url,
                "url": url
            })

        except Exception as e:
            continue

    return events
