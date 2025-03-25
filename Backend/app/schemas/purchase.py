from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PlayTimePurchaseRequest(BaseModel):
    parent_id: int
    location_id: int
    minutes: int
    price: float
    tax: float
    payment_method: str
    expiry_date: Optional[datetime] = None

class PlayTimePurchaseResponse(BaseModel):
    order_id: int
    credit_id: int
    total_minutes: int
    status: str = "completed"
