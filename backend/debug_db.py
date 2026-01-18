
from app.database import SessionLocal
from app import models
from sqlalchemy import text

def check_users():
    db = SessionLocal()
    print("Checking users...")
    try:
        users = db.query(models.User).all()
        print(f"Found {len(users)} users.")
        for u in users:
            print(f"User: {u.email} (ID: {u.id})")
    except Exception as e:
        print(f"Error querying users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
