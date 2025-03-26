from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel
from datetime import datetime

if TYPE_CHECKING:
    from app.models.bundle_service import BundleService
    from app.models.location import Location

class Bundle(SQLModel, table=True):
    
    bundle_id: Optional[int] = Field(default=None, primary_key=True)
    location_id: int = Field(foreign_key="location.location_id")
    name: str = Field(max_length=100)
    description: Optional[str] = None
    price: float
    is_subscription: Optional[bool] = Field(default=False)
    duration_days: Optional[int] = None
    is_active: Optional[bool] = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    
    location: "Location" = Relationship()
    bundle_services: List["BundleService"] = Relationship(back_populates="bundle")