from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
import datetime

router = APIRouter()

@router.get("/", response_model=List[schemas.ShoppingItem])
def get_shopping_items(
    family_id: int = 1, # Default to 1 for now until full auth context passing
    db: Session = Depends(get_db)
):
    items = db.query(models.ShoppingItem).filter(models.ShoppingItem.family_id == family_id).all()
    return items

@router.post("/", response_model=schemas.ShoppingItem)
def create_shopping_item(
    item: schemas.ShoppingItemCreate,
    family_id: int = 1,
    user_id: int = 1, # Default
    db: Session = Depends(get_db)
):
    db_item = models.ShoppingItem(
        **item.dict(),
        family_id=family_id,
        added_by_user_id=user_id,
        created_at=datetime.datetime.utcnow()
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=schemas.ShoppingItem)
def update_shopping_item(
    item_id: int,
    item_update: schemas.ShoppingItemCreate,
    db: Session = Depends(get_db)
):
    db_item = db.query(models.ShoppingItem).filter(models.ShoppingItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    for key, value in item_update.dict(exclude_unset=True).items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_shopping_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.ShoppingItem).filter(models.ShoppingItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(db_item)
    db.commit()
    return {"status": "success"}

@router.post("/{item_id}/toggle")
def toggle_bought(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.ShoppingItem).filter(models.ShoppingItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db_item.is_bought = not db_item.is_bought
    db.commit()
    return {"status": "success", "is_bought": db_item.is_bought}
