from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import database, models, schemas, auth

router = APIRouter()

@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username.lower()).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role,
        phone_number=user.phone_number,
        preferences=user.preferences
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
@router.post("/request-reset-password")
def request_password_reset(email_data: schemas.UserEmail, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == email_data.email).first()
    if not user:
        # Don't reveal user existence
        return {"message": "If that email exists, we sent a reset link."}
    
    # Generate a fake token for this prototype (in prod, sign a JWT)
    reset_token = f"reset-{user.id}-token"
    print(f"\n[DEV] Password Reset Link: http://localhost:3000/reset-password?token={reset_token}\n")
    
    return {"message": "Password reset link sent (check console for dev mode)"}

@router.post("/reset-password")
def reset_password(reset_data: schemas.PasswordReset, db: Session = Depends(database.get_db)):
    # Validate token (Mock validation)
    if not reset_data.token.startswith("reset-") or "-token" not in reset_data.token:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    try:
        user_id = int(reset_data.token.split("-")[1])
    except:
        raise HTTPException(status_code=400, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    hashed_password = auth.get_password_hash(reset_data.new_password)
    user.hashed_password = hashed_password
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.post("/dev-login")
def dev_login(email_data: schemas.UserEmail, db: Session = Depends(database.get_db)):
    """
    DEV ONLY: Login without password.
    """
    user = db.query(models.User).filter(models.User.email == email_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/setup-invite")
def setup_invite(user_update: schemas.UserCreate, token: str, db: Session = Depends(database.get_db)):
    # Find user by invite token
    user = db.query(models.User).filter(models.User.invite_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid invite token")
        
    if user.invite_expires_at and user.invite_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invite expired")
        
    # Update user details
    hashed_password = auth.get_password_hash(user_update.password)
    user.hashed_password = hashed_password
    user.name = user_update.name
    
    # In case they correct their email? Or just keep it.
    # user.email = user_update.email 
    
    user.request_token = None # Clear token
    user.status = "active"
    user.invite_token = None
    
    db.commit()
    db.refresh(user)
    
    # Generate login token so they are auto-logged in
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}
