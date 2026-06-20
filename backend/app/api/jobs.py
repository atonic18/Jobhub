from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.database import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.JobPostingOut])
def get_jobs(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    location: Optional[str] = None,
    job_type: Optional[str] = None
):
    query = db.query(models.JobPosting).filter(models.JobPosting.is_active == True)
    if category:
        query = query.filter(models.JobPosting.category == category)
    if location:
        query = query.filter(models.JobPosting.location.contains(location))
    if job_type:
        query = query.filter(models.JobPosting.job_type == job_type)
    return query.all()

@router.post("/", response_model=schemas.JobPostingOut)
def create_job(
    job_in: schemas.JobPostingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Only employers can post jobs")
    
    db_job = models.JobPosting(
        **job_in.dict(),
        employer_id=current_user.id
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.get("/{job_id}", response_model=schemas.JobPostingOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.JobPosting).filter(models.JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
