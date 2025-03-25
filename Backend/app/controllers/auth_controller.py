from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.schemas.user import LoginRequest, TokenResponse
from app.services.auth_service import authenticate_user
from app.db.database import get_session

auth_controller = APIRouter(prefix="/auth", tags=["Auth"])

@auth_controller.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_session)):
    return authenticate_user(data, db)
