from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel
from datetime import datetime

if TYPE_CHECKING:
    from app.models.bundle_service import BundleService
    from app.models.location import Location
    from app.models.zone import Zone
    from app.models.user import User
    from app.models.session import Session

class Service(SQLModel, table=True):
    
    service_id: Optional[int] = Field(default=None, primary_key=True)
    location_id: int = Field(foreign_key="location.location_id")
    zone_id: Optional[int] = Field(foreign_key="zone.zone_id", default=None)
    service_type: str = Field(max_length=50)
    name: str = Field(max_length=100)
    description: Optional[str] = None
    duration_minutes: int
    max_capacity: int
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    price: float
    created_by: int = Field(foreign_key="user.user_id")
    is_active: Optional[bool] = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    
    location: "Location" = Relationship()
    zone: Optional["Zone"] = Relationship()
    creator: "User" = Relationship()
    sessions: List["Session"] = Relationship(back_populates="service")
    bundle_services: List["BundleService"] = Relationship(back_populates="service")