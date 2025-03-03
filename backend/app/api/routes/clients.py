from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select, func
from typing import Any, Optional, List
from datetime import timedelta
from datetime import datetime
import uuid
from app.api.deps import (CurrentUser, SessionDep, GetAdminUser, GetClientGroupFromPath, GetClientFromPath, 
                          GetClientFromBody, GetClientGroupFromBody, GetClientGroupFromQuery)
from app.models import (
    Client, ClientCreate, ClientUpdate, ClientPublic, Message,
    Reservation, ReservationCreate, ReservationPublic,
    Subscription, SubscriptionCreate, SubscriptionPublic,
    Payment, PaymentCreate, PaymentPublic, Visit, VisitPublic, QRCode, ClientGroup
)


router = APIRouter()

# Client Management Routes
@router.post("/register", response_model=ClientPublic)
def register_client(
    *, session: SessionDep, client_in: ClientCreate
) -> Any:
    """Register a new client without assigning to a group"""
    client = Client.model_validate(client_in)
    # Generate QR code after saving to get ID
    session.add(client)
    session.commit()
    session.refresh(client)
    
    # Create QR code entry
    qr_code = QRCode(client_id=client.id)
    session.add(qr_code)
    
    # Update client with QR code ID
    client.qr_code = str(qr_code.id)
    session.add(client)
    session.commit()
    session.refresh(client)
    
    return client

@router.post("/register/child", response_model=ClientPublic)
def register_child(
    *, session: SessionDep, current_user: CurrentUser, client_in: ClientCreate
) -> Any:
    """Register a child for current guardian and add to same group"""
    # Find the parent client associated with the current user
    parent_client = session.exec(
        select(Client).where(Client.user_id == current_user.id)
    ).first()
    
    if not parent_client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No client profile found for current user"
        )
    
    # Create child client
    client = Client.model_validate(client_in)
    client.guardian_id = parent_client.id
    client.is_child = True
    
    # Add child to the same group as parent
    if parent_client.group_id:
        client.group_id = parent_client.group_id
    
    # Save client to generate ID
    session.add(client)
    session.commit()
    session.refresh(client)
    
    # Create QR code entry
    qr_code = QRCode(client_id=client.id)
    session.add(qr_code)
    
    # Update client with QR code ID
    client.qr_code = str(qr_code.id)
    session.add(client)
    session.commit()
    session.refresh(client)
    
    return client

@router.post("/group/{group_id}/client", response_model=ClientPublic)
def register_client_in_group(
    *, 
    session: SessionDep, 
    client_group: GetClientGroupFromPath,
    client_in: ClientCreate
) -> Any:
    """Register a new client directly into a specific group"""
    client = Client.model_validate(client_in)
    client.group_id = client_group.id
    
    # Generate QR code for the client
    session.add(client)
    session.commit()  # Commit to generate the ID
    session.refresh(client)
    
    # Create QR code entry
    qr_code = QRCode(client_id=client.id)
    session.add(qr_code)
    
    # Update client with QR code ID
    client.qr_code = str(qr_code.id)
    session.add(client)
    session.commit()
    session.refresh(client)
    
    return client

@router.post("/{parent_id}/child", response_model=ClientPublic)
def register_child_client(
    *, 
    session: SessionDep, 
    parent_id: uuid.UUID, 
    client_in: ClientCreate
) -> Any:
    """Register a child client for a parent"""
    # Verify parent exists
    parent = session.get(Client, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent client not found")
    
    client = Client.model_validate(client_in)
    client.is_child = True
    client.guardian_id = parent_id
    
    # Automatically add child to the same group as parent
    if parent.group_id:
        client.group_id = parent.group_id
    
    # Generate QR code for the client
    session.add(client)
    session.commit()  # Commit to generate the ID
    session.refresh(client)
    
    # Create QR code entry
    qr_code = QRCode(client_id=client.id)
    session.add(qr_code)
    
    # Update client with QR code ID
    client.qr_code = str(qr_code.id)
    session.add(client)
    session.commit()
    session.refresh(client)
    
    return client

@router.post("/group/{group_id}/admin/{client_id}", response_model=dict)
def add_group_admin(
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

@router.delete("/group/{group_id}/admin/{client_id}", response_model=dict)
def remove_group_admin(
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

@router.get("", response_model=List[ClientPublic])
def get_all_clients(
    session: SessionDep,
    client_group: GetClientGroupFromQuery,
    skip: int = 0,
    limit: int = 100,
    is_child: Optional[bool] = None
) -> Any:
    """Get all clients in a specific group with filtering options"""
    statement = select(Client).where(Client.group_id == client_group.id)
    
    # Apply filters if provided
    if is_child is not None:
        statement = statement.where(Client.is_child == is_child)
        
    statement = statement.offset(skip).limit(limit)
    clients = session.exec(statement).all()
    return clients

@router.get("/{client_id}", response_model=ClientPublic)
def get_client(
    *, 
    client: GetClientFromPath
) -> Any:
    """Get a specific client by ID (using dependency)"""
    return client

@router.put("/{client_id}", response_model=ClientPublic)
def update_client(
    *, 
    session: SessionDep, 
    client: GetClientFromPath,
    client_in: ClientUpdate
) -> Any:
    """Update a client"""
    # Update client attributes from input
    client_data = client_in.model_dump(exclude_unset=True)
    for key, value in client_data.items():
        setattr(client, key, value)
    
    # If guardian_id is being updated, verify the guardian exists
    if client_in.guardian_id is not None:
        guardian = session.get(Client, client_in.guardian_id)
        if not guardian:
            raise HTTPException(status_code=404, detail="Guardian client not found")
        
        # If guardian belongs to a group, consider updating child's group as well
        if guardian.group_id and client.group_id != guardian.group_id:
            client.group_id = guardian.group_id
    
    client.updated_at = datetime.utcnow()
    session.add(client)
    session.commit()
    session.refresh(client)
    return client

@router.delete("/{client_id}", response_model=dict)
def delete_client(
    *, 
    session: SessionDep, 
    client: GetClientFromPath
) -> Any:
    """Delete a client"""
    # Check if client has children
    children = session.exec(
        select(Client).where(Client.guardian_id == client.id)
    ).all()
    
    if children:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete client with children. Update or remove children first."
        )
    
    # Delete QR codes associated with the client
    qr_codes = session.exec(
        select(QRCode).where(QRCode.client_id == client.id)
    ).all()
    
    for qr_code in qr_codes:
        session.delete(qr_code)
    
    # Update group_admin reference if client is an admin
    if client.group_admin:
        client.group_admin = None
        session.add(client)
        session.commit()
    
    session.delete(client)
    session.commit()
    
    return {"message": "Client successfully deleted"}