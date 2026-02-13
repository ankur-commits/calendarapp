"""Phase 1: To-Do CRUD endpoint tests."""
from fastapi.testclient import TestClient


def _seed_family_and_user(client, db_session):
    """Create a family + user directly in DB so todo FK constraints pass."""
    from app.models import Family, User
    from app.auth import get_password_hash

    family = Family(name="Todo Family")
    db_session.add(family)
    db_session.commit()
    db_session.refresh(family)

    user = User(
        name="TodoUser",
        email="todo@example.com",
        hashed_password=get_password_hash("pass"),
        family_id=family.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return family, user


def test_create_todo(client: TestClient, db_session):
    family, user = _seed_family_and_user(client, db_session)

    response = client.post(
        "/api/todos/",
        json={"title": "Buy groceries", "status": "pending"},
        params={"family_id": family.id, "user_id": user.id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Buy groceries"
    assert data["status"] == "pending"
    assert "id" in data


def test_get_todos(client: TestClient, db_session):
    family, user = _seed_family_and_user(client, db_session)

    client.post("/api/todos/", json={"title": "Task 1"}, params={"family_id": family.id, "user_id": user.id})
    client.post("/api/todos/", json={"title": "Task 2"}, params={"family_id": family.id, "user_id": user.id})

    response = client.get("/api/todos/", params={"family_id": family.id})
    assert response.status_code == 200
    todos = response.json()
    assert len(todos) == 2


def test_get_todos_filtered_by_user(client: TestClient, db_session):
    """Test that user_id query param filters todos by assigned_to_user_id."""
    family, user = _seed_family_and_user(client, db_session)

    from app.models import User
    from app.auth import get_password_hash
    user2 = User(
        name="Other", email="other@example.com",
        hashed_password=get_password_hash("pass"), family_id=family.id,
    )
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user2)

    # Create todos with different assigned_to
    client.post("/api/todos/", json={"title": "My task", "assigned_to_user_id": user.id},
                params={"family_id": family.id, "user_id": user.id})
    client.post("/api/todos/", json={"title": "Their task", "assigned_to_user_id": user2.id},
                params={"family_id": family.id, "user_id": user.id})

    # Filter by user_id
    response = client.get("/api/todos/", params={"family_id": family.id, "user_id": user.id})
    assert response.status_code == 200
    todos = response.json()
    assert len(todos) == 1
    assert todos[0]["title"] == "My task"


def test_update_todo(client: TestClient, db_session):
    family, user = _seed_family_and_user(client, db_session)

    create = client.post(
        "/api/todos/",
        json={"title": "Old title"},
        params={"family_id": family.id, "user_id": user.id},
    )
    todo_id = create.json()["id"]

    response = client.put(
        f"/api/todos/{todo_id}",
        json={"title": "New title", "status": "completed"},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New title"
    assert response.json()["status"] == "completed"


def test_delete_todo(client: TestClient, db_session):
    family, user = _seed_family_and_user(client, db_session)

    create = client.post(
        "/api/todos/",
        json={"title": "To delete"},
        params={"family_id": family.id, "user_id": user.id},
    )
    todo_id = create.json()["id"]

    response = client.delete(f"/api/todos/{todo_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify gone
    todos = client.get("/api/todos/", params={"family_id": family.id}).json()
    assert all(t["id"] != todo_id for t in todos)


def test_delete_nonexistent_todo(client: TestClient):
    response = client.delete("/api/todos/99999")
    assert response.status_code == 404


def test_update_nonexistent_todo(client: TestClient):
    response = client.put("/api/todos/99999", json={"title": "nope"})
    assert response.status_code == 404
