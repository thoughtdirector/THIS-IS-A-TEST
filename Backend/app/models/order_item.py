from datetime import date
from typing import List, Optional, TYPE_CHECKING
from app.models.base_model import BaseModel
from sqlmodel import Field, Relationship

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.visit import Visit

class OrderItem(BaseModel, table=True):
    order_item_id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.order_id")
    item_type: str = Field(max_length=20) 
    item_id: int  
    quantity: int = Field(default=1)
    unit_price: float
    total_price: float
    minutes_credited: Optional[int] = None
    expiry_date: Optional[date] = None
    
    order: "Order" = Relationship(back_populates="order_items")
    visits: List["Visit"] = Relationship(back_populates="order_item")