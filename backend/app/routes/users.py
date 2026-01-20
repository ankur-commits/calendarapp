from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, auth
from ..database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.User])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user.family_id:
        # If user has no family, return only themselves
        return [current_user]
        
    users = db.query(models.User).filter(models.User.family_id == current_user.family_id).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    from ..auth import get_password_hash
    hashed_password = get_password_hash(user.password)
    
    db_user = models.User(
        name=user.name, 
        email=user.email.lower(), 
        hashed_password=hashed_password,
        role=user.role,
        phone_number=user.phone_number,
        preferences=user.preferences
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.put("/{user_id}", response_model=schemas.User)

def update_user(user_id: int, user: schemas.UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.name = user.name
    db_user.email = user.email
    db_user.phone_number = user.phone_number
    db_user.role = user.role
    db_user.preferences = user.preferences

    if user.password:
        from ..auth import get_password_hash
        db_user.hashed_password = get_password_hash(user.password)
    
    db.commit()
    db.refresh(db_user)
    return db_user
