from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.db.database import get_session
from app.schemas.user import UserCreate, UserRead
from app.services.user_service import register_user

user_controller = APIRouter(prefix="/users", tags=["Users"])

@user_controller.post("/", response_model=UserRead, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_session)):
    return register_user(data, db)
