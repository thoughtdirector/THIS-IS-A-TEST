from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select, Session
from typing import Any, List, Optional
from datetime import datetime
from app.api.deps import (CurrentUser, SessionDep, GetAdminUser, GetClientGroupFromPath, 
                          GetClientFromPath, GetClientGroupFromQuery)
from app.old_models import (
    Client, ClientPublic, ClientCreate, ClientUpdate,
    ClientGroup, Subscription, SubscriptionPublic, User, ClientGroupPublic, QRCode
)
import uuid

router = APIRouter()



# Client Group Routes for Clients (non-admin users)
@router.get("/my-groups", response_model=List[ClientGroupPublic])
async def get_my_client_groups(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all client groups where the current user is an admin"""
    # Get the client associated with the current user
    client = session.exec(
        select(Client).where(Client.user_id == current_user.id)
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found for current user")
    
    # Get groups where this client is an admin
    statement = select(ClientGroup).where(
        ClientGroup.id.in_(
            select(ClientGroup.id).join(Client, ClientGroup.admins).where(Client.id == client.id)
        )
    ).offset(skip).limit(limit)
    
    groups = session.exec(statement).all()
    return groups

# ClientGroup Management Routes
@router.post("", response_model=ClientGroup)
def create_client_group(
    *, session: SessionDep, current_user: GetAdminUser, name: str
) -> Any:
    """Create a new client group (admin only)"""
    client_group = ClientGroup(name=name)
    
    # Add the current admin as an admin of this group
    client_group.admins = [current_user]
    
    session.add(client_group)
    session.commit()
    session.refresh(client_group)
    return client_group

@router.get("", response_model=List[ClientGroup])
def get_client_groups(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all client groups (admin only)"""
    statement = select(ClientGroup).offset(skip).limit(limit)
    client_groups = session.exec(statement).all()
    return client_groups

@router.get("/{group_id}", response_model=ClientGroup)
def get_client_group(
    *, session: SessionDep, current_user: GetAdminUser, group_id: uuid.UUID
) -> Any:
    """Get a specific client group by ID (admin only)"""
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    return client_group

@router.put("/{group_id}", response_model=ClientGroup)
def update_client_group(
    *, session: SessionDep, current_user: GetAdminUser, group_id: uuid.UUID, name: str
) -> Any:
    """Update a client group (admin only)"""
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    client_group.name = name
    session.add(client_group)
    session.commit()
    session.refresh(client_group)
    return client_group

@router.delete("/{group_id}", response_model=dict)
def delete_client_group(
    *, session: SessionDep, current_user: GetAdminUser, group_id: uuid.UUID
) -> Any:
    """Delete a client group (admin only)"""
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    # Check if there are active subscriptions
    active_subscriptions = session.exec(
        select(Subscription)
        .where(Subscription.client_group_id == group_id)
        .where(Subscription.is_active == True)
    ).first()
    
    if active_subscriptions:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete group with active subscriptions"
        )
    
    # If no active subscriptions, set all clients' group_id to None
    clients = session.exec(
        select(Client).where(Client.group_id == group_id)
    ).all()
    
    for client in clients:
        client.group_id = None
        session.add(client)
    
    session.delete(client_group)
    session.commit()
    
    return {"message": "Client group successfully deleted"}

# Client-Group Management
@router.post("/{group_id}/clients/{client_id}", response_model=ClientPublic)
def add_client_to_group(
    *, session: SessionDep, current_user: GetAdminUser, 
    group_id: uuid.UUID, client_id: uuid.UUID
) -> Any:
    """Add a client to a group (admin only)"""
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # If client already belongs to a group, remove from that group
    if client.group_id and client.group_id != group_id:
        client.group_id = None
    
    client.group_id = group_id
    session.add(client)
    session.commit()
    session.refresh(client)
    
    return client

@router.delete("/{group_id}/clients/{client_id}", response_model=dict)
def remove_client_from_group(
    *, session: SessionDep, current_user: GetAdminUser,
    group_id: uuid.UUID, client_id: uuid.UUID
) -> Any:
    """Remove a client from a group (admin only)"""
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client.group_id != group_id:
        raise HTTPException(
            status_code=400, 
            detail="Client does not belong to this group"
        )
    
    client.group_id = None
    session.add(client)
    session.commit()
    
    return {"message": "Client successfully removed from group"}

@router.get("/{group_id}/clients", response_model=List[ClientPublic])
def get_group_clients(
    *, session: SessionDep, current_user: GetAdminUser,
    group_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> Any:
    """Get all clients in a specific group (admin only)"""
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    statement = select(Client).where(
        Client.group_id == group_id
    ).offset(skip).limit(limit)
    
    clients = session.exec(statement).all()
    return clients

@router.get("/{group_id}/subscriptions", response_model=List[SubscriptionPublic])
def get_group_subscriptions(
    *, session: SessionDep, current_user: GetAdminUser,
    group_id: uuid.UUID, skip: int = 0, limit: int = 100,
    active_only: bool = False
) -> Any:
    """Get all subscriptions for a specific group (admin only)"""
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    statement = select(Subscription).where(
        Subscription.client_group_id == group_id
    )
    
    if active_only:
        statement = statement.where(Subscription.is_active == True)
    
    statement = statement.offset(skip).limit(limit)
    subscriptions = session.exec(statement).all()
    
    return subscriptions

# User routes to associate admins with groups
@router.post("/{group_id}/admins/{admin_id}", response_model=dict)
def add_admin_to_group(
    *, session: SessionDep, current_user: GetAdminUser,
    group_id: uuid.UUID, admin_id: uuid.UUID
) -> Any:
    """Add an admin user to a client group (admin only)"""
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    admin = session.get(User, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    # Check if admin is already associated with this group
    if admin in client_group.admins:
        return {"message": "Admin already associated with this group"}
    
    client_group.admins.append(admin)
    session.add(client_group)
    session.commit()
    
    return {"message": "Admin successfully added to group"}

@router.delete("/{group_id}/admins/{admin_id}", response_model=dict)
def remove_admin_from_group(
    *, session: SessionDep, current_user: GetAdminUser,
    group_id: uuid.UUID, admin_id: uuid.UUID
) -> Any:
    """Remove an admin user from a client group (admin only)"""
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    admin = session.get(User, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    # Check if admin is associated with this group
    if admin not in client_group.admins:
        return {"message": "Admin not associated with this group"}
    
    # Ensure there's at least one admin left for the group
    if len(client_group.admins) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove the last admin from a group"
        )
    
    client_group.admins.remove(admin)
    session.add(client_group)
    session.commit()
    
    return {"message": "Admin successfully removed from group"}


# Routes for managing group admins (client-side)
@router.post("/{group_id}/admin-clients/{client_id}", response_model=dict)
def add_client_admin_to_group(
    *,
    session: SessionDep,
    current_user: GetAdminUser,
    group_id: uuid.UUID,
    client_id: uuid.UUID
) -> Any:
    """Add a client as an admin to a client group"""
    # Verify group exists
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    # Verify client exists
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Make client a group admin by updating the client record
    client.group_admin = client_group
    session.add(client)
    session.commit()
    
    return {"message": f"Client {client_id} added as admin to group {group_id}"}

@router.delete("/{group_id}/admin-clients/{client_id}", response_model=dict)
def remove_client_admin_from_group(
    *,
    session: SessionDep,
    current_user: GetAdminUser,
    group_id: uuid.UUID,
    client_id: uuid.UUID
) -> Any:
    """Remove a client as an admin from a client group"""
    # Verify group exists
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    # Verify client exists
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if client is an admin of this group
    if client.group_admin and client.group_admin.id == group_id:
        client.group_admin = None
        session.add(client)
        session.commit()
        return {"message": f"Client {client_id} removed as admin from group {group_id}"}
    else:
        raise HTTPException(
            status_code=400,
            detail="Client is not an admin of this group"
        )