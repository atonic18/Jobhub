from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db.database import get_db
from ..models import models
from ..schemas import schemas
from .deps import get_current_user

router = APIRouter()

@router.post("/", response_model=schemas.ApplicationOut)
def apply_to_job(
    app_in: schemas.ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "employee":
        raise HTTPException(status_code=403, detail="Only employees can apply to jobs")
    
    # Check if already applied
    existing = db.query(models.Application).filter(
        models.Application.job_id == app_in.job_id,
        models.Application.applicant_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")
    
    db_app = models.Application(
        **app_in.dict(),
        applicant_id=current_user.id
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.get("/my-applications", response_model=List[schemas.ApplicationOut])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Application).filter(models.Application.applicant_id == current_user.id).all()

@router.get("/job/{job_id}", response_model=List[schemas.ApplicationOut])
def get_job_applications(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    job = db.query(models.JobPosting).filter(models.JobPosting.id == job_id).first()
    if not job or job.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view these applications")
    
    return db.query(models.Application).filter(models.Application.job_id == job_id).all()

@router.patch("/{app_id}/status")
def update_application_status(
    app_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    application = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    job = db.query(models.JobPosting).filter(models.JobPosting.id == application.job_id).first()
    if job.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    application.status = status
    db.commit()
    return {"message": f"Status updated to {status}"}
