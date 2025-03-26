# Sessions Model
from datetime import datetime
from typing import List, Optional
from app.models.base_model import BaseModel
from app.models.service import Service
from app.models.user import User
from app.models.visit import Visit
from sqlmodel import Field, Relationship


class Session(BaseModel, table=True):
    
    session_id: Optional[int] = Field(default=None, primary_key=True)
    service_id: int = Field(foreign_key="service.service_id")
    staff_id: Optional[int] = Field(foreign_key="user.user_id", default=None)
    start_time: datetime
    end_time: datetime
    current_capacity: Optional[int] = Field(default=0)
    max_capacity: int
    is_canceled: Optional[bool] = Field(default=False)
    
    service: Service = Relationship(back_populates="session")
    staff: Optional[User] = Relationship(back_populates="staff_session")
    visits: List["Visit"] = Relationship(back_populates="session")