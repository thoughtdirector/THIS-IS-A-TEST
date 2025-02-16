from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import select, func
from typing import Any
from datetime import datetime
from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Client, ClientCreate, ClientUpdate, ClientPublic, Message,
    Reservation, ReservationCreate, ReservationPublic,
    Subscription, SubscriptionCreate, SubscriptionPublic,
    Payment, PaymentCreate, PaymentPublic, Visit, VisitPublic
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
    client.qr_code = generate_qr_code(client.id)
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
    if not subscription or not subscription.is_active:
        raise HTTPException(status_code=400, detail="Invalid or inactive subscription")
    existing_reservations = session.exec(
        select(Reservation)
        .where(Reservation.start_time < reservation_in.end_time)
        .where(Reservation.end_time > reservation_in.start_time)
        .where(Reservation.subscription_id == reservation_in.subscription_id)
    ).all()

    if existing_reservations:
        raise HTTPException(
            status_code=400,
            detail="Time slot already booked"
        )
    
    reservation = Reservation.model_validate(reservation_in)
    reservation.client_id = current_user.id
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


