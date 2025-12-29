from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
import datetime

router = APIRouter()

@router.get("/", response_model=List[schemas.ToDo])
def get_todos(
    family_id: int = 1,
    user_id: int = None, # Optional filter
    db: Session = Depends(get_db)
):
    query = db.query(models.ToDo).filter(models.ToDo.family_id == family_id)
    if user_id:
        query = query.filter(models.ToDo.assigned_to_user_id == user_id)
    return query.all()

@router.post("/", response_model=schemas.ToDo)
def create_todo(
    todo: schemas.ToDoCreate,
    family_id: int = 1,
    user_id: int = 1, 
    db: Session = Depends(get_db)
):
    db_todo = models.ToDo(
        **todo.dict(),
        family_id=family_id,
        created_by_user_id=user_id
    )
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

@router.put("/{todo_id}", response_model=schemas.ToDo)
def update_todo(
    todo_id: int,
    todo_update: schemas.ToDoCreate,
    db: Session = Depends(get_db)
):
    db_todo = db.query(models.ToDo).filter(models.ToDo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="ToDo not found")
    
    for key, value in todo_update.dict(exclude_unset=True).items():
        setattr(db_todo, key, value)
    
    db.commit()
    db.refresh(db_todo)
    return db_todo

@router.delete("/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    db_todo = db.query(models.ToDo).filter(models.ToDo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="ToDo not found")
    
    db.delete(db_todo)
    db.commit()
    return {"status": "success"}
