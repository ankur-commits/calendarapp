from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..services.logistics import LogisticsService

router = APIRouter()

@router.post("/", response_model=schemas.Event)
def create_event(event: schemas.EventCreate, db: Session = Depends(get_db)):
    event_data = event.dict()
    attendee_ids = event_data.pop("attendee_ids", [])
    
    # [NEW] Calculate Commute Logic
    if event_data.get("location"):
        # For simplicity, we assume "Home" as start or previous event. 
        # In a real app, we'd find the user's previous location.
        event_data["commute_time_minutes"] = LogisticsService.get_drive_time("Home", event_data["location"])
    
    db_event = models.Event(**event_data)
    
    if attendee_ids:
        attendees = db.query(models.User).filter(models.User.id.in_(attendee_ids)).all()
        db_event.attendees = attendees
        
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/", response_model=List[schemas.Event])
def read_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    events = db.query(models.Event).offset(skip).limit(limit).all()
    return events

@router.get("/{event_id}", response_model=schemas.Event)
def read_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.put("/{event_id}", response_model=schemas.Event)
def update_event(event_id: int, event_update: schemas.EventCreate, db: Session = Depends(get_db)):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if db_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_data = event_update.dict()
    attendee_ids = event_data.pop("attendee_ids", [])
    
    # [NEW] Recalculate Commute if location changed
    if event_data.get("location") and event_data["location"] != db_event.location:
        event_data["commute_time_minutes"] = LogisticsService.get_drive_time("Home", event_data["location"])
    
    # Update basic fields
    for key, value in event_data.items():
        setattr(db_event, key, value)
    
    # Update attendees
    # Clear existing
    if attendee_ids:
        db_event.attendees = [] # Clear only if we are sending new list, otherwise might want to keep?
                               # Actually better to replace if list provided.
        attendees = db.query(models.User).filter(models.User.id.in_(attendee_ids)).all()
        db_event.attendees = attendees
        
    db.commit()
    db.refresh(db_event)
    return db_event

@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if db_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(db_event)
    db.commit()
    return {"message": "Event deleted successfully"}
