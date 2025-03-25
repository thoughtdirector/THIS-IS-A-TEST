from fastapi import HTTPException, status
from sqlmodel import Session, select
from app.models.user import User
from app.core.security import verify_password, create_access_token
from app.schemas.user import LoginRequest, TokenResponse

def authenticate_user(data: LoginRequest, db: Session) -> TokenResponse:
    user = db.exec(select(User).where(User.email == data.email)).first()
    if not user or not verify_password(data.password, user.hash_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(data={"sub": user.email})
    return TokenResponse(access_token=token)
