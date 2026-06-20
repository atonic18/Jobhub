from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db.database import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user

router = APIRouter()

@router.get("/conversations", response_model=List[schemas.MessageOut]) # Simplified
def get_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # This is a mock/simplified version
    return []

@router.post("/messages", response_model=schemas.MessageOut)
def send_message(
    msg_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_msg = models.Message(
        conversation_id=msg_in.conversation_id,
        sender_id=current_user.id,
        content=msg_in.content
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg
