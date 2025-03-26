from collections.abc import Generator
from typing import Annotated, Optional

import uuid
import jwt
from fastapi import Depends, HTTPException, status, Query, Body, Path
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError, BaseModel
from sqlmodel import Session, select

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.old_models import TokenPayload, User, AdminUser, Client, ClientGroup, ClientGroupAdminLink

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
async def get_client(
    client_id: Optional[uuid.UUID] = None,
    session: SessionDep = Depends(),
    current_user: User = Depends(get_current_user),
) -> Client:
    """
    Get a client by ID or the current user's client.
    - If client_id is provided, check permissions and return that client
    - If no client_id is provided, find the client associated with the current user
    """
    if client_id:
        # Get specific client by ID and check permissions
        client = session.get(Client, client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        
        # Check permissions
        if current_user.is_superuser:
            return client
        
        if client.user_id == current_user.id:
            return client
        
        # Check if user is admin of client's group
        if client.group_id:
            is_group_admin = session.exec(
                select(ClientGroupAdminLink)
                .where(ClientGroupAdminLink.client_group_id == client.group_id)
                .where(ClientGroupAdminLink.admin_id == current_user.id)
            ).first() is not None
            
            if is_group_admin:
                return client
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this client"
        )
    else:
        # Find the client associated with the current user
        client = session.exec(
            select(Client).where(Client.user_id == current_user.id)
        ).first()
        
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No client profile found for current user"
            )
        return client

async def get_client_group(
    group_id: Optional[uuid.UUID] = None,
    session: SessionDep = Depends(),
    current_user: User = Depends(get_current_user),
) -> ClientGroup:
    """
    Get a client group by ID or the user's default group.
    - If group_id is provided, check permissions and return that group
    - If no group_id is provided, find the user's only accessible group
    """
    if group_id:
        
        client_group = session.get(ClientGroup, group_id)
        if not client_group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client group not found"
            )
        
   
        if current_user.admin_user:
            return client_group
     
        is_group_admin = session.exec(
            select(ClientGroupAdminLink)
            .where(ClientGroupAdminLink.client_group_id == group_id)
            .where(ClientGroupAdminLink.admin_id == current_user.id)
        ).first() is not None
        
        if is_group_admin:
            return client_group
        
     
        is_client_in_group = session.exec(
            select(Client)
            .where(Client.user_id == current_user.id)
            .where(Client.group_id == group_id)
        ).first() is not None
        
        if is_client_in_group:
            return client_group
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this client group"
        )
    else:
      
        if current_user.admin_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Superusers must specify a group_id"
            )
        
        
        admin_groups_query = (
            select(ClientGroup)
            .join(ClientGroupAdminLink)
            .where(ClientGroupAdminLink.admin_id == current_user.id)
        )
        
       
        client_groups_query = (
            select(ClientGroup)
            .join(Client)
            .where(Client.user_id == current_user.id)
            .where(Client.group_id == ClientGroup.id)
        )
        
        # Combine both queries with UNION to get unique results
        accessible_groups = session.exec(
            admin_groups_query.union(client_groups_query)
        ).all()
        
        if not accessible_groups:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No client groups accessible for current user"
            )
        
        if len(accessible_groups) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Multiple client groups found. Please specify a group_id"
            )
        
        # User has exactly one accessible group
        return accessible_groups[0]

# Path parameter dependencies (for URLs like /clients/{client_id})

def get_client_from_path(
    session: SessionDep,
    client_id: uuid.UUID = Path(...),
    
    current_user: User = Depends(get_current_user),
) -> Client:
    return get_client(client_id, session, current_user)

def get_client_group_from_path(
    session: SessionDep,
    group_id: uuid.UUID = Path(...),
    
    current_user: User = Depends(get_current_user),
) -> ClientGroup:
    return get_client_group(group_id, session, current_user)

# Query parameter dependencies (for URLs like /clients?client_id=uuid)

def get_client_from_query(
    session: SessionDep,
    client_id: Optional[uuid.UUID] = Query(None),
    
    current_user: User = Depends(get_current_user),
) -> Client:
    return get_client(client_id, session, current_user)

def get_client_group_from_query(
    session: SessionDep,
    group_id: Optional[uuid.UUID] = Query(None),
    
    current_user: User = Depends(get_current_user),
) -> ClientGroup:
    return get_client_group(group_id, session, current_user)

# Helper functions for extracting IDs from request body

def extract_client_id_from_body(body: dict = Body(...)) -> Optional[uuid.UUID]:
    client_id = body.get("client_id")
    return uuid.UUID(client_id) if client_id else None

def extract_group_id_from_body(body: dict = Body(...)) -> Optional[uuid.UUID]:
    group_id = body.get("group_id")
    return uuid.UUID(group_id) if group_id else None

# Body parameter dependencies (for POST/PUT requests with JSON body)

def get_client_from_body(
    session: SessionDep,
    client_id: Optional[uuid.UUID] = Depends(extract_client_id_from_body),
    
    current_user: User = Depends(get_current_user),
) -> Client:
    return get_client(client_id, session, current_user)

def get_client_group_from_body(
    session: SessionDep,
    group_id: Optional[uuid.UUID] = Depends(extract_group_id_from_body),
    
    current_user: User = Depends(get_current_user),
) -> ClientGroup:
    return get_client_group(group_id, session, current_user)


GetClientFromPath = Annotated[Client, Depends(get_client_from_path)]
GetClientGroupFromPath = Annotated[ClientGroup, Depends(get_client_group_from_path)]
GetClientFromQuery = Annotated[Client, Depends(get_client_from_query)]
GetClientGroupFromQuery = Annotated[ClientGroup, Depends(get_client_group_from_query)]
GetClientFromBody = Annotated[Client, Depends(get_client_from_body)]
GetClientGroupFromBody = Annotated[ClientGroup, Depends(get_client_group_from_body)]