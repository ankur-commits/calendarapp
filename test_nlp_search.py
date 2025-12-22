"""
Test script for the natural language query parser
"""

from nlp_query_parser import parse_natural_query, filter_events_by_parsed_query
import json

# Test queries
test_queries = [
    "music events for kids after 5 pm on saturday",
    "free outdoor concerts this weekend",
    "business networking events under $50",
    "yoga classes in the morning",
    "family friendly activities",
    "tech meetups on weekdays"
]

# Sample events for testing filtering
sample_events = [
    {
        "source": "Ticketmaster",
        "datetime": None,
        "title": "Kids Music Concert",
        "url": "https://example.com/1",
        "location": "Seattle, WA",
        "details": {
            "Smart Category": "Music",
            "Info": "A fun music concert for children and families"
        }
    },
    {
        "source": "Eventbrite",
        "datetime": None,
        "title": "Business Networking Mixer",
        "url": "https://example.com/2",
        "location": "Redmond, WA",
        "details": {
            "Smart Category": "Business & Networking",
            "Info": "Professional networking event for entrepreneurs"
        }
    },
    {
        "source": "Eventbrite",
        "datetime": None,
        "title": "Morning Yoga Class",
        "url": "https://example.com/3",
        "location": "Bellevue, WA",
        "details": {
            "Smart Category": "Health & Wellness",
            "Info": "Relaxing yoga session in the morning"
        }
    }
]

def test_parser():
    print("Testing Natural Language Query Parser")
    print("=" * 50)
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        try:
            # Test with fallback parser (no OpenAI API call)
            from nlp_query_parser import _fallback_parse
            result = _fallback_parse(query)
            print(f"Parsed result:")
            print(json.dumps(result, indent=2))
            
            # Test filtering
            filtered_events = filter_events_by_parsed_query(sample_events, result)
            print(f"Matching events: {len(filtered_events)}")
            for event in filtered_events:
                print(f"  - {event['title']} ({event['details']['Smart Category']})")
                
        except Exception as e:
            print(f"Error: {e}")
        
        print("-" * 30)

if __name__ == "__main__":
    test_parser()
