from sqlmodel import SQLModel, Field
from typing import Optional
import uuid

class Service(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    duration_minutes: int
    price: float
