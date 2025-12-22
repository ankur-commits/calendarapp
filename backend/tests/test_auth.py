from fastapi.testclient import TestClient
from app.models import User
from app.database import Base

def test_register_user(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "password123",
            "role": "admin",
            "phone_number": "1234567890"
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_login_user(client: TestClient):
    # Register first
    client.post(
        "/api/auth/register",
        json={
            "name": "Test User",
            "email": "login@example.com",
            "password": "password123"
        },
    )
    
    # Login
    response = client.post(
        "/api/auth/token",
        data={"username": "login@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client: TestClient):
    response = client.post(
        "/api/auth/token",
        data={"username": "wrong@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401

def test_password_reset_flow(client: TestClient):
    # Register
    reg_response = client.post(
        "/api/auth/register",
        json={
            "name": "Reset User",
            "email": "reset@example.com",
            "password": "oldpassword"
        },
    )
    user_id = reg_response.json()["id"]

    # Request Reset
    response = client.post(
        "/api/auth/request-reset-password",
        json={"email": "reset@example.com"}
    )
    assert response.status_code == 200
    
    # Reset Password (using predictable token pattern from auth.py)
    reset_token = f"reset-{user_id}-token"
    
    response = client.post(
        "/api/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": "newpassword123"
        }
    )
    assert response.status_code == 200
    
    # Verify login with new password
    response = client.post(
        "/api/auth/token",
        data={"username": "reset@example.com", "password": "newpassword123"},
    )
    assert response.status_code == 200
