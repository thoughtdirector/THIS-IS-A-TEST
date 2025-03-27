from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.bundle import Bundle
    from app.models.service import Service

class BundleService(SQLModel, table=True):
    bundle_service_id: Optional[int] = Field(default=None, primary_key=True)
    bundle_id: int = Field(foreign_key="bundle.bundle_id")
    service_id: int = Field(foreign_key="service.service_id")
    quantity: int
   
    bundle: "Bundle" = Relationship(back_populates="bundle_services")
    service: "Service" = Relationship(back_populates="bundle_services")