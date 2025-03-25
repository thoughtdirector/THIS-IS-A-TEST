from sqlmodel import SQLModel, Field
from typing import Optional

class Location(SQLModel, table=True):
    location_id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    address: Optional[str] = None
