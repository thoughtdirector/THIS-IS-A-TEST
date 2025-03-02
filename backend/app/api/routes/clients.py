from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import select, func
from typing import Any, Optional, List
from datetime import timedelta
from datetime import datetime
import uuid
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
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
    """Register a new client"""
    client = Client.model_validate(client_in)
    client.qr_code = generate_qr_code(client.id)  # Implement QR generation
    session.add(client)
    session.commit()
    session.refresh(client)
    return client

@router.post("/register/child", response_model=ClientPublic)
def register_child(
    *, session: SessionDep, current_user: CurrentUser, client_in: ClientCreate
) -> Any:
    """Register a child for current guardian"""
    client = Client.model_validate(client_in)
    client.guardian_id = current_user.id
    client.is_child = True
    session.add(client)
    session.commit()
    session.refresh(client)
    return client

# Reservation Routes
@router.post("/reservations", response_model=ReservationPublic)
def create_reservation(
    *, session: SessionDep, current_user: CurrentUser, reservation_in: ReservationCreate
) -> Any:
    """Create a new reservation"""
    # Validate subscription and availability
    subscription = session.get(Subscription, reservation_in.subscription_id)

    # REMOVE THIS IF SUBSCRIPTION IS NECESSARY
    # if not subscription or not subscription.is_active:
    #     raise HTTPException(status_code=400, detail="Invalid or inactive subscription")
    # if subscription.user_id != current_user.user_id:
    #     raise HTTPException(status_code=400, detail="Invalid or inactive subscription")
    print(reservation_in, "\n\n\n")
    existing_reservations = session.exec(
        select(Reservation)
        .where(Reservation.date < reservation_in.date + timedelta(reservation_in.duration_hours))
        .where(Reservation.date  + timedelta(reservation_in.duration_hours) > reservation_in.date)
        .where(Reservation.subscription_id == reservation_in.subscription_id)
    ).all()

    if existing_reservations:
        raise HTTPException(
            status_code=400,
            detail="Time slot already booked"
        )
    
    reservation = Reservation.model_validate(reservation_in)

    #ACTIVATE TO STOP PEOPLE FROM RESERVING FOR OTHER PEOPLE
    # if reservation.client_id != current_user.id:
    #     if not current_user.is_admin:
    #         error

    #reservation.client_id = current_user.id
    session.add(reservation)
    session.commit()
    session.refresh(reservation)
    return reservation

# Payment Routes
@router.post("/payments", response_model=PaymentPublic)
def create_payment(
    *, session: SessionDep, current_user: CurrentUser, payment_in: PaymentCreate
) -> Any:
    """Process a new payment"""
    payment = Payment.model_validate(payment_in)
    payment.client_id = current_user.id
    # Implement payment gateway integration here
    session.add(payment)
    session.commit()
    session.refresh(payment)
    return payment

@router.get("/visits", response_model=list[VisitPublic])
def get_visits(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    statement = select(Visit).where(
        Visit.client_id == current_user.id
    ).offset(skip).limit(limit)
    visits = session.exec(statement).all()
    return visits

@router.get("/subscriptions", response_model=list[VisitPublic])
def get_visits(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    statement = select(Visit).where(
        Visit.client_id == current_user.id
    ).offset(skip).limit(limit)
    visits = session.exec(statement).all()
    return visits



@router.post("", response_model=ClientPublic)
def register_client(
    *, session: SessionDep, current_user: GetAdminUser, client_in: ClientCreate
) -> Any:
    """Register a new client (admin only)"""
    client = Client.model_validate(client_in)
    
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

@router.post("/group/{group_id}", response_model=ClientPublic)
def register_client_in_group(
    *, session: SessionDep, current_user: GetAdminUser, 
    group_id: uuid.UUID, client_in: ClientCreate
) -> Any:
    """Register a new client directly into a specific group (admin only)"""
    # Verify group exists
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    client = Client.model_validate(client_in)
    client.group_id = group_id
    
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

@router.post("/child/{parent_id}", response_model=ClientPublic)
def register_child_client(
    *, session: SessionDep, current_user: GetAdminUser,
    parent_id: uuid.UUID, client_in: ClientCreate
) -> Any:
    """Register a child client for a parent (admin only)"""
    # Verify parent exists
    parent = session.get(Client, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent client not found")
    
    client = Client.model_validate(client_in)
    client.is_child = True
    client.guardian_id = parent_id
    
    # If parent belongs to a group, automatically add child to the same group
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

@router.get("", response_model=List[ClientPublic])
def get_all_clients(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100,
    group_id: Optional[uuid.UUID] = None,
    is_child: Optional[bool] = None
) -> Any:
    """Get all clients with filtering options (admin only)"""
    statement = select(Client)
    
    # Apply filters if provided
    if group_id is not None:
        statement = statement.where(Client.group_id == group_id)
    
    if is_child is not None:
        statement = statement.where(Client.is_child == is_child)
        
    statement = statement.offset(skip).limit(limit)
    clients = session.exec(statement).all()
    return clients

@router.get("/{client_id}", response_model=ClientPublic)
def get_client(
    *, session: SessionDep, current_user: GetAdminUser, client_id: uuid.UUID
) -> Any:
    """Get a specific client by ID (admin only)"""
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/{client_id}", response_model=ClientPublic)
def update_client(
    *, session: SessionDep, current_user: GetAdminUser, 
    client_id: uuid.UUID, client_in: ClientUpdate
) -> Any:
    """Update a client (admin only)"""
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
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
    
    session.add(client)
    session.commit()
    session.refresh(client)
    return client

@router.delete("/{client_id}", response_model=dict)
def delete_client(
    *, session: SessionDep, current_user: GetAdminUser, client_id: uuid.UUID
) -> Any:
    """Delete a client (admin only)"""
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if client has children
    children = session.exec(
        select(Client).where(Client.guardian_id == client_id)
    ).all()
    
    if children:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete client with children. Update or remove children first."
        )
    
    # Delete QR codes associated with the client
    qr_codes = session.exec(
        select(QRCode).where(QRCode.client_id == client_id)
    ).all()
    
    for qr_code in qr_codes:
        session.delete(qr_code)
    
    session.delete(client)
    session.commit()
    
    return {"message": "Client successfully deleted"}