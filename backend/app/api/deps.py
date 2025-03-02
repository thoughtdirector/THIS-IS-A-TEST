from collections.abc import Generator
from typing import Annotated, Optional

import uuid
import jwt
from fastapi import Depends, HTTPException, status, Query, Body
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError, BaseModel
from sqlmodel import Session, select

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.models import TokenPayload, User, AdminUser

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


async def get_admin_user(
    session: SessionDep,
    current_user: CurrentUser,
) -> AdminUser:
    """
    Verify if the current user has an associated AdminUser instance.
    Returns the AdminUser if it exists, otherwise raises an exception.
    """
    admin_user = session.exec(
        select(AdminUser).where(AdminUser.user_id == current_user.id)
    ).first()
    
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have administrative privileges"
        )
    return current_user

GetAdminUser = Annotated[User,Depends(get_admin_user)]

async def get_client_group(
    group_id: uuid.UUID = Path(...),
    session: SessionDep = Depends(),
    current_user: User = Depends(get_current_user),
) -> ClientGroup:
    """
    Get a client group by ID. 
    - If the user is an admin, allow access to any group
    - If the user is not an admin, only allow access if they are an admin of the group
    """
    # First, check if the group exists
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client group not found"
        )
    
    # If the user is a system admin, allow access
    if current_user.is_superuser:
        return client_group
    
    # Otherwise, check if the user is an admin of this specific group
    is_group_admin = session.exec(
        select(ClientGroupAdminLink)
        .where(ClientGroupAdminLink.client_group_id == group_id)
        .where(ClientGroupAdminLink.admin_id == current_user.id)
    ).first() is not None
    
    if not is_group_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this client group"
        )
    
    return client_group

# Create a typed annotation for use in route functions
GetClientGroup = Annotated[ClientGroup, Depends(get_client_group)]