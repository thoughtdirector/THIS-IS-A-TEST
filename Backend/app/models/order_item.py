# Order Items Model
from datetime import date
from typing import List, Optional
from app.models.base_model import BaseModel
from app.models.child import Child
from app.models.order import Order
from app.models.visit import Visit
from sqlmodel import Field, Relationship


class OrderItem(BaseModel, table=True):
    __tablename__ = "order_item"
    
    order_item_id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.order_id")
    child_id: int = Field(foreign_key="child.child_id")
    item_type: str = Field(max_length=20)  # 'service', 'bundle', 'play_time'
    item_id: int
    quantity: int = Field(default=1)
    unit_price: float
    total_price: float
    minutes_credited: Optional[int] = None
    expiry_date: Optional[date] = None
    
    order: Order = Relationship(back_populates="order_item")
    visits: List["Visit"] = Relationship(back_populates="order_item")
    child: Child = Relationship(back_populates="order_item")
