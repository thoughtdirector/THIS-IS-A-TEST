from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ChildCreate(BaseModel):
    parent_id: int
    fullname: str
    birth_date: date
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    special_notes: Optional[str] = None

class ChildRead(ChildCreate):
    child_id: int
    is_active: bool
    created_at: datetime
