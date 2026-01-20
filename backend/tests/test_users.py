from fastapi.testclient import TestClient

def test_create_user(client: TestClient):
    response = client.post(
        "/api/users/",
        json={
            "name": "Integration User",
            "email": "integration@example.com",
            "password": "password123",
            "role": "member"
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "integration@example.com"
    assert "id" in data

def test_read_users(client: TestClient):
    # Create a user
    client.post(
        "/api/users/",
        json={
            "name": "User 1",
            "email": "user1@example.com",
            "password": "pwd"
        },
    )
    
    # Login
    login_res = client.post(
        "/api/auth/token",
        data={"username": "user1@example.com", "password": "pwd"},
    )
    token = login_res.json()["access_token"]
    
    response = client.get("/api/users/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    # Should only return self (1 user) because no family
    assert len(data) >= 1

def test_read_user_by_id(client: TestClient):
    # Create
    res = client.post(
        "/api/users/",
        json={
            "name": "User 2",
            "email": "user2@example.com",
            "password": "pwd"
        },
    )
    user_id = res.json()["id"]
    
    response = client.get(f"/api/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "User 2"

def test_update_user(client: TestClient):
    # Create
    res = client.post(
        "/api/users/",
        json={
            "name": "To Update",
            "email": "update@example.com",
            "password": "pwd"
        },
    )
    user_id = res.json()["id"]
    
    # Update
    response = client.put(
        f"/api/users/{user_id}",
        json={
            "name": "Updated Name",
            "email": "update@example.com",
            "role": "admin"
        },
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"
    assert response.json()["role"] == "admin"
