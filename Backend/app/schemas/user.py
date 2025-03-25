from pydantic import BaseModel, EmailStr, constr
from typing import Optional

class UserCreate(BaseModel):
    role_id: int
    location_id: Optional[int] = None
    email: EmailStr
    fullname: str
    phone: Optional[str] = None
    password: constr(min_length=8)
    document_type: str
    document_number: str
    terms_accepted: bool

class UserRead(BaseModel):
    user_id: int
    email: EmailStr
    fullname: str
    role_id: int
    location_id: Optional[int] = None
    phone: Optional[str] = None

    model_config = {"from_attributes": True}





class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"