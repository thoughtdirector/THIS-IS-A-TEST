from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class OrderItem(SQLModel, table=True):
    order_item_id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.order_id")
    item_type: str  # 'play_time'
    item_id: int  # 0 for play_time
    quantity: int = 1
    unit_price: float
    total_price: float
    minutes_credited: Optional[int] = None
    expiry_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
