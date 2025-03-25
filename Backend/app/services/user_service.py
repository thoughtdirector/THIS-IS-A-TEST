from sqlmodel import Session, select
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash
from fastapi import HTTPException, status

def register_user(data: UserCreate, db: Session) -> User:
    existing = db.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    user = User(
        role_id=data.role_id,
        location_id=data.location_id,
        email=data.email,
        fullname=data.fullname,
        phone=data.phone,
        hash_password=get_password_hash(data.password),
        document_type=data.document_type,
        document_number=data.document_number,
        terms_accepted=data.terms_accepted
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
