from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class User(SQLModel, table=True):
    user_id: Optional[int] = Field(default=None, primary_key=True)
    role_id: int
    location_id: Optional[int] = None
    email: str = Field(index=True, unique=True)
    fullname: str
    phone: Optional[str] = None
    hash_password: str
    document_type: str
    document_number: str
    terms_accepted: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
