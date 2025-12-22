from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    category: str = "General"
    # [NEW] Logistics
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    commute_time_minutes: int = 0
    driver_id: Optional[int] = None

class EventCreate(EventBase):
    attendee_ids: List[int] = []

class Event(EventBase):
    id: int
    family_id: Optional[int] = None
    created_by_user_id: Optional[int] = None
    attendees: List['User'] = []
    driver: Optional['User'] = None

    class Config:
        orm_mode = True

class UserBase(BaseModel):
    name: str
    email: str
    phone_number: Optional[str] = None
    role: str = "member"
    preferences: Optional[dict] = {}
    # [NEW] Profile
    avatar_url: Optional[str] = None
    mobile_phone: Optional[str] = None
    color: str = "#3B82F6"

class UserEmail(BaseModel):
    email: str

class PasswordReset(BaseModel):
    token: str
    new_password: str

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class User(UserBase):
    id: int
    family_id: Optional[int] = None

    class Config:
        orm_mode = True

# [NEW] Chores and Shopping
class ChoreBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "pending"
    reward_amount: int = 0
    due_date: Optional[datetime] = None
    assigned_to_user_id: Optional[int] = None

class ChoreCreate(ChoreBase):
    pass

class Chore(ChoreBase):
    id: int
    family_id: Optional[int] = None
    assigned_to: Optional[User] = None

    class Config:
        orm_mode = True

class ShoppingItemBase(BaseModel):
    name: str
    category: str = "General"
    is_bought: bool = False

class ShoppingItemCreate(ShoppingItemBase):
    pass

class ShoppingItem(ShoppingItemBase):
    id: int
    family_id: Optional[int] = None
    added_by_user_id: Optional[int] = None
    added_by: Optional[User] = None

    class Config:
        orm_mode = True

class FamilyBase(BaseModel):
    name: str

class FamilyCreate(FamilyBase):
    pass

class Family(FamilyBase):
    id: int
    users: List[User] = []
    events: List[Event] = []
    
    class Config:
        orm_mode = True
