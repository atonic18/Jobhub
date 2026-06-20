from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..models import models
from ..core.config import settings

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)) -> models.User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=403, detail="Could not validate credentials")
    except JWTError:
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
