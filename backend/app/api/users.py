from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..models import models
from .deps import get_current_user

router = APIRouter()

@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.patch("/profile")
def update_profile(
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Update profile logic here
    return {"message": "Profile updated"}
