from typing import List, Optional, TYPE_CHECKING
from app.models.base_model import BaseModel
from sqlmodel import Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User

class Role(BaseModel, table=True):
    role_id: Optional[int] = Field(default=None, primary_key=True)
    role_name: str = Field(max_length=50, unique=True)
    description: Optional[str] = None
    
    users: List["User"] = Relationship(back_populates="role")