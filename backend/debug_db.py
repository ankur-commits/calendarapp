
from app.database import SessionLocal
from app import models
from sqlalchemy import text

def test_db_schema():
    db = SessionLocal()
    try:
        # Try to select the new columns
        # If they don't exist, this should fail at SQL level
        print("Querying events...")
        events = db.query(models.Event).all()
        for e in events:
            # Access a new field to force load if lazy
            print(f"Event: {e.title}, Driver: {e.driver_id}")
            
    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_db_schema()
