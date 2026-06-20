from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserBase

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class JobPostingBase(BaseModel):
    title: str
    description: str
    requirements: str
    salary_range: str
    location: str
    job_type: str
    category: str

class JobPostingCreate(JobPostingBase):
    pass

class JobPostingOut(JobPostingBase):
    id: int
    employer_id: int
    created_at: datetime
    is_active: bool
    class Config:
        orm_mode = True

class ApplicationCreate(BaseModel):
    job_id: int
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None

class ApplicationOut(BaseModel):
    id: int
    job_id: int
    applicant_id: int
    status: str
    created_at: datetime
    class Config:
        orm_mode = True

class MessageCreate(BaseModel):
    conversation_id: int
    content: str

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    timestamp: datetime
    is_read: bool
    class Config:
        orm_mode = True
