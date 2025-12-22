
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime

def _scrape_event_details(event_url, headers):
    try:
        response = requests.get(event_url, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching event details page {event_url}: {e}")
        return "N/A"

    soup = BeautifulSoup(response.text, "lxml")

    # First, try to extract date from twitter:data2 meta tag
    twitter_data2_tag = soup.find("meta", {"name": "twitter:data2"})
    if twitter_data2_tag and twitter_data2_tag.get("value"):
        return twitter_data2_tag["value"].strip()

    # Fallback to existing regex search if meta tag not found
    date_pattern = re.compile(r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\/\d{1,2}\s+at\s+\d{1,2}(:\d{2})?(am|pm)", re.IGNORECASE)

    match = date_pattern.search(soup.get_text())
    if match:
        return match.group(0).strip()

    possible_date_elements = soup.find_all(lambda tag: tag.name in ["p", "span", "div", "time", "h2", "h3", "h4"])

    for element in possible_date_elements:
        text = element.get_text(strip=True)
        match = date_pattern.search(text)
        if match:
            return match.group(0).strip()

    return "N/A"


def scrape_eventbrite_local(location="Sammamish", days=7):
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
            # Extract title directly from h3 tag with known class
            title_tag = card.select_one("h3.event-card__clamp-line--two")
            title = title_tag.get_text(strip=True) if title_tag else "No title"

            link_tag = card.select_one("a.event-card-link")
            url = link_tag['href'] if link_tag and link_tag.get("href") else ""

            # Scrape event details from the individual event page
            datetime_str = _scrape_event_details(url, headers)

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

            # The datetime_str is now obtained from the individual event page, so this line is no longer needed for date
            # datetime_str = p_tags[0].get_text(strip=True) if len(p_tags) > 0 else "No date"
            location_str = p_tags[1].get_text(strip=True) if len(p_tags) > 1 else "No location"

            price_tag = card.select_one("div.DiscoverHorizontalEventCard-module__priceWrapper___3rOUY p")
            price = price_tag.get_text(strip=True) if price_tag else "Free or No price info"

            img_tag = card.select_one("img.event-card-image")
            image_url = img_tag['src'] if img_tag and img_tag.get("src") else ""

            events.append({
                "title": title,
                "date": datetime_str, # Use the date scraped from the individual event page
                "location": location_str,
                "price": price,
                "image_url": image_url,
                "url": url
            })

        except Exception as e:
            print(f"Error processing event card: {e}")
            continue

    return events

if __name__ == "__main__":
    events = scrape_eventbrite_local()
    for i, event in enumerate(events):
        if i < 2: # Get details for the first 2 events
            print(f"Scraping details for: {event['url']}")
            _scrape_event_details(event['url'], {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            })
        print(event)
