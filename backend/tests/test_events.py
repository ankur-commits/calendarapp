from datetime import datetime, timedelta
from fastapi.testclient import TestClient

def test_create_event(client: TestClient):
    start = datetime.now()
    end = start + timedelta(hours=1)
    
    response = client.post(
        "/api/events/",
        json={
            "title": "Test Event",
            "description": "This is a test event",
            "location": "Test Location",
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "category": "Work"
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Event"
    assert "id" in data

def test_read_events(client: TestClient):
    # Create two events
    start = datetime.now()
    client.post(
        "/api/events/",
        json={
            "title": "Event 1",
            "start_time": start.isoformat(),
            "end_time": (start + timedelta(hours=1)).isoformat(),
        },
    )
    client.post(
        "/api/events/",
        json={
            "title": "Event 2",
            "start_time": start.isoformat(),
            "end_time": (start + timedelta(hours=1)).isoformat(),
        },
    )
    
    response = client.get("/api/events/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2

def test_update_event(client: TestClient):
    # Create
    start = datetime.now()
    create_res = client.post(
        "/api/events/",
        json={
            "title": "Original Title",
            "start_time": start.isoformat(),
            "end_time": (start + timedelta(hours=1)).isoformat(),
        },
    )
    event_id = create_res.json()["id"]
    
    # Update
    response = client.put(
        f"/api/events/{event_id}",
        json={
            "title": "Updated Title",
            "start_time": start.isoformat(),
            "end_time": (start + timedelta(hours=1)).isoformat(),
            "category": "Fun"
        },
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"

def test_delete_event(client: TestClient):
    # Create
    start = datetime.now()
    create_res = client.post(
        "/api/events/",
        json={
            "title": "To Delete",
            "start_time": start.isoformat(),
            "end_time": (start + timedelta(hours=1)).isoformat(),
        },
    )
    event_id = create_res.json()["id"]
    
    # Delete
    response = client.delete(f"/api/events/{event_id}")
    assert response.status_code == 200
    
    # Verify gone
    response = client.get(f"/api/events/{event_id}")
    assert response.status_code == 404
