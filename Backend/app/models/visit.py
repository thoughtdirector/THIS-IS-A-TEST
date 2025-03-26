from app.models.base_model import BaseModel
from sqlmodel import Relationship, Field
from typing import Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from app.models.child import Child
    from app.models.location import Location
    from app.models.zone import Zone
    from app.models.session import Session
    from app.models.order_item import OrderItem
    from app.models.credit import Credit
    from app.models.user import User

class Visit(BaseModel, table=True):
   
    visit_id: Optional[int] = Field(default=None, primary_key=True)
    child_id: int = Field(foreign_key="child.child_id")
    location_id: int = Field(foreign_key="location.location_id")
    zone_id: Optional[int] = Field(foreign_key="zone.zone_id", default=None)
    session_id: Optional[int] = Field(foreign_key="session.session_id", default=None)
    order_item_id: Optional[int] = Field(foreign_key="order_item.order_item_id", default=None)
    credit_id: Optional[int] = Field(foreign_key="credit.credit_id", default=None)
    
    check_in_by_id: Optional[int] = Field(foreign_key="user.user_id", default=None)
    check_out_by_id: Optional[int] = Field(foreign_key="user.user_id", default=None)
    
    visit_type: str = Field(max_length=20)
    status: Optional[str] = Field(default="confirmed", max_length=20)
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    minutes_used: Optional[int] = None
    
    child: "Child" = Relationship(back_populates="visit")
    location: "Location" = Relationship(back_populates="visit")
    zone: Optional["Zone"] = Relationship(back_populates="visit")
    session: Optional["Session"] = Relationship(back_populates="visit")
    order_item: Optional["OrderItem"] = Relationship(back_populates="visit")
    credit: Optional["Credit"] = Relationship(back_populates="visit")
    
    check_in_by: Optional["User"] = Relationship(back_populates="check_ins")
    check_out_by: Optional["User"] = Relationship(back_populates="check_outs")
