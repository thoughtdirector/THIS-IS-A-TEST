from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date, datetime

class Child(SQLModel, table=True):
    child_id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="user.user_id")
    fullname: str
    birth_date: date
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    special_notes: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
