from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Credit(SQLModel, table=True):
    credit_id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="user.user_id")
    location_id: int = Field(foreign_key="location.location_id")
    minutes_remaining: int
    expiry_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
