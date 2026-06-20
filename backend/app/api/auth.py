from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..models import models
from ..schemas import schemas
from ..core import security

router = APIRouter()

@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = security.get_password_hash(user_in.password)
    db_user = models.User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role=user_in.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create empty profile
    if db_user.role == "employee":
        profile = models.EmployeeProfile(user_id=db_user.id)
        db.add(profile)
    elif db_user.role == "employer":
        profile = models.EmployerProfile(user_id=db_user.id, company_name=db_user.full_name)
        db.add(profile)
    
    db.commit()
    
    access_token = security.create_access_token(subject=db_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not user or not security.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = security.create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }
