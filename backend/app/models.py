from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, JSON, Table
from sqlalchemy.orm import relationship
from .database import Base
import datetime

# Association table for Event attendees
event_attendees = Table('event_attendees', Base.metadata,
    Column('event_id', Integer, ForeignKey('events.id')),
    Column('user_id', Integer, ForeignKey('users.id'))
)

class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    
    users = relationship("User", back_populates="family")
    events = relationship("Event", back_populates="family")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="member") # 'admin' or 'member'
    is_active = Column(Boolean, default=True)
    phone_number = Column(String, nullable=True)
    family_id = Column(Integer, ForeignKey("families.id"))
    
    # [NEW] Profile fields
    avatar_url = Column(String, nullable=True)
    mobile_phone = Column(String, nullable=True) # Distinct from phone_number if needed, or reuse
    color = Column(String, default="#3B82F6") # Default blue

    family = relationship("Family", back_populates="users")
    created_events = relationship("Event", back_populates="creator", foreign_keys="[Event.created_by_user_id]")
    attending_events = relationship("Event", secondary=event_attendees, back_populates="attendees")
    
    preferences = Column(JSON, default={})

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    location = Column(String, nullable=True)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, default=datetime.datetime.utcnow)
    category = Column(String, default="General") # Work, Hobby, Family, etc.
    
    family_id = Column(Integer, ForeignKey("families.id"))
    created_by_user_id = Column(Integer, ForeignKey("users.id"))

    family = relationship("Family", back_populates="events")
    creator = relationship("User", back_populates="created_events", foreign_keys=[created_by_user_id])
    attendees = relationship("User", secondary=event_attendees, back_populates="attending_events")

    # [NEW] Logistics fields
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    latitude = Column(String, nullable=True)
    longitude = Column(String, nullable=True)
    commute_time_minutes = Column(Integer, default=0)
    
    driver = relationship("User", foreign_keys=[driver_id])

class Chore(Base):
    __tablename__ = "chores"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, completed, verified
    reward_amount = Column(Integer, default=0) # e.g. cents or points
    due_date = Column(DateTime, nullable=True)

    family_id = Column(Integer, ForeignKey("families.id"))
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    family = relationship("Family")
    assigned_to = relationship("User")

class ShoppingItem(Base):
    __tablename__ = "shopping_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String, default="General")
    is_bought = Column(Boolean, default=False)
    
    family_id = Column(Integer, ForeignKey("families.id"))
    added_by_user_id = Column(Integer, ForeignKey("users.id"))

    family = relationship("Family")
    added_by = relationship("User")
