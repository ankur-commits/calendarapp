"""Phase 1: Extended auth tests — /me, /setup-invite, /dev-login, edge cases."""
from fastapi.testclient import TestClient
from tests.mocks.fixtures import register_and_login, create_family_for_user


def test_auth_me_returns_current_user(client: TestClient):
    """GET /api/auth/me returns the authenticated user's data."""
    user_data, headers = register_and_login(client, email="me@example.com")

    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["id"] == user_data["id"]


def test_auth_me_without_token(client: TestClient):
    """GET /api/auth/me without a token returns 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_auth_me_with_invalid_token(client: TestClient):
    """GET /api/auth/me with a bad token returns 401."""
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == 401


def test_dev_login(client: TestClient):
    """POST /api/auth/dev-login returns a token for an existing user."""
    register_and_login(client, email="dev@example.com")

    response = client.post("/api/auth/dev-login", json={"email": "dev@example.com"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_dev_login_nonexistent_user(client: TestClient):
    """POST /api/auth/dev-login for a missing user returns 404."""
    response = client.post("/api/auth/dev-login", json={"email": "ghost@example.com"})
    assert response.status_code == 404


def test_register_duplicate_email(client: TestClient):
    """Registering with the same email twice returns 400."""
    payload = {"name": "User", "email": "dup@example.com", "password": "pass123"}
    client.post("/api/auth/register", json=payload)

    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_password_reset_invalid_token(client: TestClient):
    """Invalid reset tokens are rejected."""
    response = client.post(
        "/api/auth/reset-password",
        json={"token": "not-a-valid-token", "new_password": "newpass"},
    )
    assert response.status_code == 400


def test_password_reset_nonexistent_user(client: TestClient):
    """Reset token pointing to non-existent user returns 404."""
    response = client.post(
        "/api/auth/reset-password",
        json={"token": "reset-99999-token", "new_password": "newpass"},
    )
    assert response.status_code == 404


def test_request_reset_unknown_email(client: TestClient):
    """Requesting a reset for an unknown email still returns 200 (no info leak)."""
    response = client.post(
        "/api/auth/request-reset-password",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == 200


def test_setup_invite_flow(client: TestClient, db_session):
    """Full invite setup: admin invites → new user completes setup-invite."""
    # 1. Register admin and create family
    _, admin_headers = register_and_login(client, email="admin@example.com")
    create_family_for_user(client, admin_headers, "Invite Family")

    # 2. Admin invites a new member
    invite_resp = client.post(
        "/api/families/invite",
        json={"email": "newmember@example.com", "name": "New Member"},
        headers=admin_headers,
    )
    assert invite_resp.status_code == 200

    # 3. Retrieve the invite token from the DB
    from app.models import User
    invited_user = db_session.query(User).filter(User.email == "newmember@example.com").first()
    assert invited_user is not None
    assert invited_user.invite_token is not None
    token = invited_user.invite_token

    # 4. New user completes setup-invite
    setup_resp = client.post(
        "/api/auth/setup-invite",
        json={
            "name": "New Member Updated",
            "email": "newmember@example.com",
            "password": "newpassword123",
        },
        params={"token": token},
    )
    assert setup_resp.status_code == 200
    data = setup_resp.json()
    assert "access_token" in data

    # 5. Verify user is now active
    db_session.refresh(invited_user)
    assert invited_user.status == "active"
    assert invited_user.invite_token is None
