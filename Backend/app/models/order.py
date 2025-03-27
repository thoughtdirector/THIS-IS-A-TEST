from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from app.models.base_model import BaseModel
from sqlmodel import Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.location import Location
    from app.models.order_item import OrderItem

class Order(BaseModel, table=True):
    order_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id")
    location_id: int = Field(foreign_key="location.location_id")
    order_date: Optional[datetime] = Field(default_factory=datetime.utcnow)
    subtotal: float
    tax: float
    total: float
    payment_status: Optional[str] = Field(default="pending", max_length=20)
    transaction_id: Optional[str] = Field(max_length=100, default=None)
    payment_method: Optional[str] = Field(max_length=50, default=None)
    
    user: "User" = Relationship(back_populates="orders")
    location: "Location" = Relationship(back_populates="orders")
    order_items: List["OrderItem"] = Relationship(back_populates="order")