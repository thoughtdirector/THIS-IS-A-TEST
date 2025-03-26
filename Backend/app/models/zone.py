# Zones Model
from typing import List, Optional
from app.models.visit import Visit
from app.models.base_model import BaseModel
from app.models.location import Location
from app.models.user import User
from sqlmodel import Field, Relationship


class Zone(BaseModel, table=True):
    
    zone_id: Optional[int] = Field(default=None, primary_key=True)
    location_id: int = Field(foreign_key="location.location_id")
    name: str = Field(max_length=100)
    description: Optional[str] = None
    max_capacity: int
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    staff_id: Optional[int] = Field(foreign_key="user.user_id", default=None)
    
    location: Location = Relationship(back_populates="zone")
    staff: Optional[User] = Relationship()
    visits: List["Visit"] = Relationship(back_populates="zone")