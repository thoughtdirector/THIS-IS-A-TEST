# Credits Model
from datetime import date
from typing import List, Optional
from app.models.base_model import BaseModel
from app.models.location import Location
from app.models.user import User
from app.models.visit import Visit
from sqlmodel import Field, Relationship


class Credit(BaseModel, table=True):
    
    credit_id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="user.user_id")
    location_id: int = Field(foreign_key="location.location_id")
    minutes_remaining: int = Field(default=0)
    expiry_date: Optional[date] = None
    
    parent: User = Relationship(back_populates="credit")
    location: Location = Relationship(back_populates="credit")
    visits: List["Visit"] = Relationship(back_populates="credit")