from app.models.base_model import BaseModel
from sqlmodel import Relationship, Field
from typing import List, Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from app.models.child import Child
    from app.models.role import Role
    from app.models.location import Location
    from app.models.visit import Visit
    from app.models.service import Service
    from app.models.order import Order
    from app.models.credit import Credit
    from app.models.session import Session

class User(BaseModel, table=True):
    user_id: Optional[int] = Field(default=None, primary_key=True)
    role_id: int = Field(foreign_key="role.role_id")
    location_id: Optional[int] = Field(foreign_key="location.location_id", default=None)
    email: str = Field(max_length=100, unique=True)
    fullname: str = Field(max_length=100)
    phone: Optional[str] = Field(max_length=20, default=None)
    hash_password: str = Field(max_length=255)
    document_type: str = Field(max_length=20)
    document_number: str = Field(max_length=30)
    terms_accepted: Optional[bool] = Field(default=False)
    
    role: "Role" = Relationship(back_populates="users")
    location: Optional["Location"] = Relationship(back_populates="users")
    children: List["Child"] = Relationship(back_populates="parent")
    created_services: List["Service"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Service.created_by"})
    orders: List["Order"] = Relationship(back_populates="user")
    credits: List["Credit"] = Relationship(back_populates="parent")
    assigned_zones: List["Zone"] = Relationship(back_populates="staff", sa_relationship_kwargs={"foreign_keys": "Zone.staff_id"})
    staff_sessions: List["Session"] = Relationship(back_populates="staff", sa_relationship_kwargs={"foreign_keys": "Session.staff_id"})
    check_ins: List["Visit"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Visit.check_in_by"})
    check_outs: List["Visit"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Visit.check_out_by"})