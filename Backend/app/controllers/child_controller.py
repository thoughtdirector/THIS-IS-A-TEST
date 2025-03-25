from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from app.db.database import get_session
from app.schemas.child import ChildCreate, ChildRead
from app.services.child_service import create_child_profile

child_controller = APIRouter(prefix="/children", tags=["Children"])

@child_controller.post("/", response_model=ChildRead, status_code=status.HTTP_201_CREATED)
def create_child(data: ChildCreate, db: Session = Depends(get_session)):
    return create_child_profile(data, db)
