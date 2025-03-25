from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Order(SQLModel, table=True):
    order_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.user_id")
    location_id: int = Field(foreign_key="location.location_id")
    order_date: datetime = Field(default_factory=datetime.utcnow)
    subtotal: float
    tax: float
    total: float
    payment_status: str = "pending"
    transaction_id: Optional[str] = None
    payment_method: Optional[str] = None
