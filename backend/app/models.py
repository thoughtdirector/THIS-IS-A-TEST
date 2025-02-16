import uuid

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel, JSON, select, Text
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB, BYTEA
from sqlalchemy_json import mutable_json_type
from sqlalchemy import Column, ARRAY, String
from pgvector.sqlalchemy import Vector

#Irrelevant ITEMS

# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore




# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


class Item(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, max_length=255)

   


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=255)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name



# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int




# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)


class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    hashed_password: str
    full_name: Optional[str] = Field(default=None, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    admin_user: Optional["AdminUser"] = Relationship(back_populates="user")

   


class ClientBase(SQLModel):
    full_name: str = Field(max_length=255)
    email: EmailStr = Field(unique=True, index=True)
    phone: str = Field(max_length=20)
    is_active: bool = True
    is_child: bool = False
    qr_code: Optional[str] = None

class Client(ClientBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    guardian_id: Optional[uuid.UUID] = Field(default=None, foreign_key="client.id")
    children: List["Client"] = Relationship(
        back_populates="guardian",
        sa_relationship_kwargs={"remote_side": "Client.id"}
    )
    guardian: Optional["Client"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "Client.guardian_id"}
    )
    subscriptions: List["Subscription"] = Relationship(back_populates="client")
    reservations: List["Reservation"] = Relationship(back_populates="client")
    visits: List["Visit"] = Relationship(back_populates="client")

class Plan(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=255)
    description: str = Field(max_length=1000)
    price: float
    duration_hours: Optional[int] = None  # For hourly plans
    duration_days: Optional[int] = None   # For subscription length
    is_class_plan: bool = False
    max_classes: Optional[int] = None
    is_active: bool = True
    subscriptions: List["Subscription"] = Relationship(back_populates="plan")

class Subscription(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="client.id")
    plan_id: uuid.UUID = Field(foreign_key="plan.id")
    start_date: datetime
    end_date: datetime
    remaining_hours: Optional[float] = None
    remaining_classes: Optional[int] = None
    is_active: bool = True
    total_cost: float
    client: Client = Relationship(back_populates="subscriptions")
    plan: Plan = Relationship(back_populates="subscriptions")



class Reservation(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="client.id")
    date: datetime
    duration_hours: float
    status: str = Field(max_length=20)  # pending, confirmed, cancelled, completed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    subscription_id: Optional[uuid.UUID] = Field(foreign_key="subscription.id")
    client: Client = Relationship(back_populates="reservations")

class Visit(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="client.id")
    check_in: datetime = Field(default_factory=datetime.utcnow)
    check_out: Optional[datetime] = None
    duration: Optional[float] = None  # in hours
    subscription_id: Optional[uuid.UUID] = Field(foreign_key="subscription.id")
    client: Client = Relationship(back_populates="visits")

class Notification(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: uuid.UUID = Field(foreign_key="user.id")
    target_client_id: Optional[uuid.UUID] = Field(foreign_key="client.id", default=None)
    is_broadcast: bool = False

class Payment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="client.id")
    amount: float
    status: str = Field(max_length=20)  # pending, completed, failed, refunded
    payment_method: str = Field(max_length=50)
    transaction_id: str = Field(max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    subscription_id: Optional[uuid.UUID] = Field(foreign_key="subscription.id")

class AdminUser(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user: "User" = Relationship(back_populates="admin_user")
    actions: List["AdminAction"] = Relationship(back_populates="admin")

class AdminAction(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    admin_id: uuid.UUID = Field(foreign_key="adminuser.id")
    action_type: str = Field(max_length=50)  # create, update, delete, view
    entity_type: str = Field(max_length=50)  # client, subscription, payment, etc.
    entity_id: uuid.UUID
    description: str = Field(max_length=1000)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    admin: AdminUser = Relationship(back_populates="actions")
