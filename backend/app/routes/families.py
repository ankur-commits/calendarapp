from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import database, models, schemas
from ..auth import get_current_user
import uuid
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/", response_model=schemas.Family)
def create_family(
    family: schemas.FamilyCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.family_id:
        raise HTTPException(status_code=400, detail="User already belongs to a family")
    
    db_family = models.Family(name=family.name)
    db.add(db_family)
    db.commit()
    db.refresh(db_family)
    
    # Assign user to family and make them admin
    current_user.family_id = db_family.id
    current_user.role = "admin"
    db.commit()
    
    return db_family

@router.post("/join-request")
def request_to_join_family(
    request: schemas.JoinRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.family_id:
        raise HTTPException(status_code=400, detail="User already belongs to a family")
        
    admin_user = db.query(models.User).filter(models.User.email == request.admin_email.lower()).first()
    if not admin_user or not admin_user.family_id:
        # Don't reveal exact details, but valid admin is needed
        raise HTTPException(status_code=404, detail="Family Admin not found")
        
    # In a real app, send email/notification to Admin.
    # For now, update status and print to console.
    current_user.status = "requested_join"
    db.commit()
    
    print(f"\n[DEV] JOIN REQUEST: User {current_user.email} wants to join Family {admin_user.family_id} (Admin: {admin_user.email})\n")
    
    return {"message": "Request sent to family admin"}

@router.post("/invite")
def invite_member(
    invite: schemas.FamilyInvite,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="You must belong to a family to invite members")
        
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can invite members")
        
    # Check if user exists
    existing_user = db.query(models.User).filter(models.User.email == invite.email.lower()).first()
    
    # Generate token
    invite_token = str(uuid.uuid4())
    expires = datetime.utcnow() + timedelta(days=7)
    
    if existing_user:
        if existing_user.family_id:
            raise HTTPException(status_code=400, detail="User already belongs to a family")
        
        # Link existing user? Or just send invite?
        # Ideally, existing user should accept. For MVP, we can auto-add if they have no family?
        # Safer: Send invite link.
        existing_user.invite_token = invite_token
        existing_user.invite_expires_at = expires
        existing_user.status = "pending_invite"
        # Temporarily store the intended family_id? 
        # Actually, for existing users, we need them to click the link to confirm.
        # But where do we store the family reference if we don't put it on the user object?
        # For simplicity MVP: Set family_id but keep status as pending?
        existing_user.family_id = current_user.family_id 
        db.commit()
        
        print(f"\n[DEV] INVITE LINK (Existing User): http://localhost:3000/invite?token={invite_token}\n")
        return {"message": "Invite sent to existing user"}
        
    else:
        # Create new user placeholder
        from ..auth import get_password_hash
        # Use a random temp password
        temp_password = str(uuid.uuid4())
        hashed_password = get_password_hash(temp_password)
        
        new_user = models.User(
            email=invite.email.lower(),
            name=invite.name,
            hashed_password=hashed_password,
            role=invite.role,
            family_id=current_user.family_id,
            invite_token=invite_token,
            invite_expires_at=expires,
            status="pending_invite"
        )
        db.add(new_user)
        db.commit()
        
        print(f"\n[DEV] INVITE LINK (New User): http://localhost:3000/invite?token={invite_token}\n")
        
        return {"message": "Invite created for new user"}
