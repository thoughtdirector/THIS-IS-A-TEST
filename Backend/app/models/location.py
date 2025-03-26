from sqlmodel import Relationship, Field
from typing import TYPE_CHECKING, List, Optional
from app.models.base_model import BaseModel

if TYPE_CHECKING:
    from app.models.visit import Visit
    from app.models.credit import Credit
    from app.models.order import Order
    from app.models.service import Service
    from app.models.user import User
    from app.models.zone import Zone


# Locations Model
class Location(BaseModel, table=True):
    
    location_id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    address: str
    city: str = Field(max_length=50)
    state: Optional[str] = Field(max_length=50, default=None)
    postal_code: Optional[str] = Field(max_length=20, default=None)
    country: str = Field(max_length=50)
    phone: Optional[str] = Field(max_length=20, default=None)
    email: Optional[str] = Field(max_length=100, default=None)
    
    users: List["User"] = Relationship(back_populates="location")
    zones: List["Zone"] = Relationship(back_populates="location")
    services: List["Service"] = Relationship(back_populates="location")
    orders: List["Order"] = Relationship(back_populates="location")
    credits: List["Credit"] = Relationship(back_populates="location")
    visits: List["Visit"] = Relationship(back_populates="location")