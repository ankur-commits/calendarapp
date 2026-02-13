"""Phase 1: Shopping list CRUD endpoint tests."""
from fastapi.testclient import TestClient


def _seed_family_and_user(client, db_session):
    """Create a family + user directly in DB so shopping FK constraints pass."""
    from app.models import Family, User
    from app.auth import get_password_hash

    family = Family(name="Test Family")
    db_session.add(family)
    db_session.commit()
    db_session.refresh(family)

    user = User(
        name="Shopper",
        email="shopper@example.com",
        hashed_password=get_password_hash("pass"),
        family_id=family.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return family, user


def test_create_shopping_item(client: TestClient, db_session):
    family, user = _seed_family_and_user(client, db_session)

    response = client.post(
        "/api/shopping/",
        json={"name": "Milk", "category": "Food"},
        params={"family_id": family.id, "user_id": user.id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Milk"
    assert data["category"] == "Food"
    assert data["is_bought"] is False
    assert "id" in data


def test_get_shopping_items(client: TestClient, db_session):
    family, user = _seed_family_and_user(client, db_session)

    # Create two items
    client.post("/api/shopping/", json={"name": "Eggs"}, params={"family_id": family.id, "user_id": user.id})
    client.post("/api/shopping/", json={"name": "Bread"}, params={"family_id": family.id, "user_id": user.id})

    response = client.get("/api/shopping/", params={"family_id": family.id})
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 2
    names = {i["name"] for i in items}
    assert names == {"Eggs", "Bread"}


def test_update_shopping_item(client: TestClient, db_session):
    family, user = _seed_family_and_user(client, db_session)

    create = client.post(
        "/api/shopping/",
        json={"name": "Mlk", "category": "Food"},
        params={"family_id": family.id, "user_id": user.id},
    )
    item_id = create.json()["id"]

    response = client.put(
        f"/api/shopping/{item_id}",
        json={"name": "Milk", "category": "Dairy"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Milk"
    assert response.json()["category"] == "Dairy"


def test_delete_shopping_item(client: TestClient, db_session):
    family, user = _seed_family_and_user(client, db_session)

    create = client.post(
        "/api/shopping/",
        json={"name": "Soda"},
        params={"family_id": family.id, "user_id": user.id},
    )
    item_id = create.json()["id"]

    response = client.delete(f"/api/shopping/{item_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify gone
    items = client.get("/api/shopping/", params={"family_id": family.id}).json()
    assert all(i["id"] != item_id for i in items)


def test_toggle_bought(client: TestClient, db_session):
    family, user = _seed_family_and_user(client, db_session)

    create = client.post(
        "/api/shopping/",
        json={"name": "Juice"},
        params={"family_id": family.id, "user_id": user.id},
    )
    item_id = create.json()["id"]

    # Toggle on
    r1 = client.post(f"/api/shopping/{item_id}/toggle")
    assert r1.status_code == 200
    assert r1.json()["is_bought"] is True

    # Toggle off
    r2 = client.post(f"/api/shopping/{item_id}/toggle")
    assert r2.status_code == 200
    assert r2.json()["is_bought"] is False


def test_delete_nonexistent_item(client: TestClient):
    response = client.delete("/api/shopping/99999")
    assert response.status_code == 404


def test_toggle_nonexistent_item(client: TestClient):
    response = client.post("/api/shopping/99999/toggle")
    assert response.status_code == 404
