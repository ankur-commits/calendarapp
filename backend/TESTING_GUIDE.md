# Backend Testing Guide

This document serves as a comprehensive guide for maintaining, extending, and debugging the backend test suite for the Calendar App. It is designed for both human developers and AI coding agents.

## 1. Overview

The backend testing stack is built on Python standards, ensuring isolation and speed.

-   **Test Runner**: [pytest](https://docs.pytest.org/)
-   **Framework**: [FastAPI TestClient](https://fastapi.tiangolo.com/tutorial/testing/) (based on `httpx`).
-   **Database**: SQLite (in-memory) for zero-latency, isolated test runs.
-   **Mocking**: `unittest.mock` for external services (OpenAI, Logistics).

## 2. Project Structure

Tests are located in `backend/tests/` and generally mirror the service/logic they are testing.

```
backend/tests/
├── conftest.py          # Global fixtures (DB session, TestClient, Overrides)
├── test_auth.py         # Auth flow (Register, Login, Password Reset)
├── test_users.py        # User management tests
├── test_events.py       # Event CRUD tests
├── test_features.py     # AI/NLP and Logistics service tests (Mocked)
└── ...
```

## 3. Running Tests

Run tests from the **root** or `backend/` directory.

-   **Run All Tests**:
    ```bash
    pytest backend/tests
    ```
-   **Run Specific Test File**:
    ```bash
    pytest backend/tests/test_auth.py
    ```
-   **Run with Output (Print Statements)**:
    ```bash
    pytest -s backend/tests
    ```
-   **Run Specific Test Case**:
    ```bash
    pytest backend/tests/test_auth.py::test_register_user
    ```

## 4. Writing Tests

### 4.1 Database & API Tests (`TestClient`)

We use a shared `client` fixture from `conftest.py`. This client:
1.  Spinning up an in-memory SQLite database.
2.  Creating all tables (`Base.metadata.create_all`).
3.  Overriding the `get_db` dependency in FastAPI to use the test session.
4.  Dropping tables after the test finishes.

**Pattern**:
```python
from fastapi.testclient import TestClient

def test_create_item(client: TestClient):
    # 1. Action
    response = client.post(
        "/api/items/",
        json={"name": "New Item", "price": 10.5}
    )
    
    # 2. Assert Status
    assert response.status_code == 200
    
    # 3. Assert Data
    data = response.json()
    assert data["name"] == "New Item"
    assert "id" in data
```

### 4.2 Auth & State
The database resets for every test function. If you need a logged-in user:
1.  Register the user within the test.
2.  Login (get token).
3.  Use the token in headers.

```python
def test_protected_route(client: TestClient):
    # Setup: Register
    client.post("/api/auth/register", json={...})
    
    # Setup: Login
    login_res = client.post("/api/auth/token", data={...})
    token = login_res.json()["access_token"]
    
    # Action: Protected Request
    response = client.get(
        "/api/protected",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
```

### 4.3 Mocking External Services
For tests involving OpenAI, Email, or Geocoding, **DO NOT** make real API calls. Use `unittest.mock`.

```python
from unittest.mock import MagicMock
from app.services.nlp import parse_natural_query

def test_nlp_service():
    # 1. Mock Client
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = '{"events": []}'
    mock_client.chat.completions.create.return_value = mock_completion
    
    # 2. Call Function with Mock
    result = parse_natural_query("Sample query", openai_client=mock_client)
    
    # 3. Assert
    assert result == {"events": []}
```

## 5. Guide for AI Agents

When working on backend tasks, follow these rules:

1.  **Check `conftest.py`**: Understand how the `db_session` and `client` are set up. Do not change this file unless you are changing the entire testing strategy.
2.  **No Real External Calls**: fast, reliable tests are non-negotiable. Always mock OpenAI, Google Maps, and Email services.
3.  **Isolation**: Ensure tests do not depend on state from other tests. The `db_session` fixture handles resets, so assume an empty DB at the start of every test function.
4.  **Update Tests**: If you change a model or schema, you must update the corresponding tests (and likely the `json` payloads in API calls).
5.  **Debugging**: If a test fails, run with `pytest -vv` to see full diffs.

---
**Last Updated**: 2026-02-15
