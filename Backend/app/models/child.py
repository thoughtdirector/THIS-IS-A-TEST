from app.models.base_model import BaseModel
from sqlmodel import Relationship, Field
from typing import List, Optional, TYPE_CHECKING
from datetime import date

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.visit import Visit

class Child(BaseModel, table=True):
    child_id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="user.user_id")
    fullname: str = Field(max_length=100)
    birth_date: date
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = Field(max_length=100, default=None)
    emergency_contact_phone: Optional[str] = Field(max_length=20, default=None)
    emergency_contact_relationship: Optional[str] = Field(max_length=50, default=None)
    special_notes: Optional[str] = None
   
    parent: "User" = Relationship(back_populates="children")
    visits: List["Visit"] = Relationship(back_populates="child")