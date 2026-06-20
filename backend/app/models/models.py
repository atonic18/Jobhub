from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db.database import Base
import enum

class UserRole(str, enum.Enum):
    EMPLOYEE = "employee"
    EMPLOYER = "employer"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String, default="employee")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee_profile = relationship("EmployeeProfile", back_populates="user", uselist=False)
    employer_profile = relationship("EmployerProfile", back_populates="user", uselist=False)
    job_postings = relationship("JobPosting", back_populates="employer")
    applications = relationship("Application", back_populates="applicant")

class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    bio = Column(Text, nullable=True)
    skills = Column(String, nullable=True)
    experience = Column(Text, nullable=True)
    education = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    resume_url = Column(String, nullable=True)

    user = relationship("User", back_populates="employee_profile")

class EmployerProfile(Base):
    __tablename__ = "employer_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_name = Column(String)
    company_description = Column(Text, nullable=True)
    website = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    location = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)

    user = relationship("User", back_populates="employer_profile")

class JobPosting(Base):
    __tablename__ = "job_postings"
    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    requirements = Column(Text)
    salary_range = Column(String)
    location = Column(String)
    job_type = Column(String) # Remote, On-site, Hybrid
    category = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employer = relationship("User", back_populates="job_postings")
    applications = relationship("Application", back_populates="job")

class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id"))
    applicant_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending") # pending, accepted, rejected, interview
    resume_url = Column(String, nullable=True)
    cover_letter = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("JobPosting", back_populates="applications")
    applicant = relationship("User", back_populates="applications")

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id"))
    user2_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    content = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    plan_name = Column(String)
    status = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
