# Base classes for common fields
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class BaseModel(SQLModel):
    is_active: Optional[bool] = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)