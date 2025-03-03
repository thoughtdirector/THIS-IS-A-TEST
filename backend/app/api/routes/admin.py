from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import select, func, SQLModel, desc
from typing import Any
from datetime import timedelta
from datetime import datetime

from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models import (
    Client,  Visit, Notification, NotificationCreate,
    Plan, Subscription, Payment, ClientPublic, PlanCreate, VisitPublic, QRCode, 
    SubscriptionCreate, ClientGroup, Reservation, ReservationPublic, ClientGroupPublic,
    SubscriptionPublic
)
import uuid
from typing import Optional, List, Dict, Any

router = APIRouter()
# Client Management Routes
@router.get("/clients", response_model=list[ClientPublic])
def get_all_clients(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all clients with filtering options"""
    statement = select(Client).offset(skip).limit(limit)
    clients = session.exec(statement).all()
    return clients

# Client Management Routes
@router.get("/client-groups", response_model=list[ClientGroupPublic])
def get_all_clients(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all clients with filtering options"""
    statement = select(ClientGroup).offset(skip).limit(limit)
    clients = session.exec(statement).all()
    return clients

@router.post("/notifications", response_model=Notification)
def create_notification(
    *, session: SessionDep, current_user: GetAdminUser, notification_in: NotificationCreate
) -> Any:
    """Create a new notification"""
    notification = Notification.model_validate(notification_in)
    notification.created_by = current_user.id
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification

# Visit Management Routes
@router.post("/visits/check-in", response_model=Visit)
def check_in_client(
    *, session: SessionDep, current_user: GetAdminUser, client_id: uuid.UUID, check_in: Optional[datetime] = None
) -> Any:
    """
    Check in a client using QR code.
    Verifies that the client belongs to a group with an active subscription
    and that the client does not already have an active visit.
    """
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if not client.group_id:
        raise HTTPException(status_code=400, detail="Client is not assigned to a group with a subscription")
    
    # Look up the active subscription via the client group
    subscription = session.exec(
        select(Subscription)
        .where(Subscription.client_group_id == client.group_id)
        .where(Subscription.is_active == True)
    ).first()
    if not subscription:
        raise HTTPException(status_code=400, detail="No active subscription found for this client's group")
  
    
    # Ensure there is no already active visit
    active_visit = session.exec(
        select(Visit)
        .where(Visit.client_id == client_id)
        .where(Visit.check_out == None)
    ).first()
    if active_visit:
        raise HTTPException(status_code=400, detail="Client already has an active visit")
    
    visit = Visit(
        client_id=client_id,
        check_in=check_in if check_in is not None else datetime.utcnow(),
        subscription_id=subscription.id  # Linking the visit to the subscription if needed
        
    )
    
    session.add(visit)
    session.commit()
    session.refresh(visit)
    return visit


@router.put("/visits/{visit_id}/check-out", response_model=Visit)
def check_out_client(
    *, session: SessionDep, current_user: GetAdminUser, visit_id: uuid.UUID
) -> Any:
    """Check out a client and update the group subscription accordingly"""
    visit = session.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit.check_out:
        raise HTTPException(status_code=400, detail="Visit has already ended")
    
    check_out = datetime.utcnow()
    visit.check_out = check_out
    # Optionally, add: visit.checked_out_by = current_user.id
    duration = (check_out - visit.check_in).total_seconds()
    visit.duration = max(duration, 3600)  # Enforcing a minimum duration if required
    
    session.add(visit)
    session.commit()
    session.refresh(visit)
    
    # Retrieve the client to access the associated group subscription
    client = session.get(Client, visit.client_id)
    if not client or not client.group_id:
        raise HTTPException(status_code=400, detail="Client is not assigned to a group with a subscription")
    
    subscription = session.exec(
        select(Subscription)
        .where(Subscription.client_group_id == client.group_id)
        .where(Subscription.is_active == True)
    ).first()
    
    if subscription:
        if subscription.remaining_time is not None and subscription.remaining_time >= duration:
            subscription.remaining_time -= duration
        else:
            subscription.remaining_time = 0
        if subscription.remaining_time is not None and subscription.remaining_time <= 0:
            subscription.is_active = False
        session.add(subscription)
        session.commit()
    
    return visit


@router.get("/check-qr", response_model=Visit)
def check_qr_code(
    *,
    session: SessionDep,
    current_user: GetAdminUser,
    client_id: uuid.UUID,
    qr_code_id: uuid.UUID
) -> Any:
    """
    Read a QR code associated with a client.
    If the client already has an active visit, then check the visit out.
    Otherwise, verify subscription validity and check the client in.
    """
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    scanned_qr = session.get(QRCode, qr_code_id)
    if not scanned_qr:
        raise HTTPException(status_code=404, detail="QR code not found")
    
    # Ensure that the QR code belongs to the client.
    if scanned_qr.client_id != client.id:
        raise HTTPException(status_code=400, detail="QR code does not belong to the client")
    
    active_visit = session.exec(
        select(Visit)
        .where(Visit.client_id == client_id)
        .where(Visit.check_out == None)
    ).first()
    
    if active_visit:
        # Check out the active visit.
        check_out_time = datetime.utcnow()
        active_visit.check_out = check_out_time
        # Optionally, add: active_visit.checked_out_by = current_user.id
        duration = (check_out_time - active_visit.check_in).total_seconds()
        active_visit.duration = duration

        session.add(active_visit)
        session.commit()
        session.refresh(active_visit)
        
        if not client.group_id:
            raise HTTPException(status_code=400, detail="Client is not assigned to a group with a subscription")
        
        subscription = session.exec(
            select(Subscription)
            .where(Subscription.client_group_id == client.group_id)
            .where(Subscription.is_active == True)
        ).first()
        
        if subscription:
            if subscription.remaining_time is not None:
                if subscription.remaining_time >= duration:
                    subscription.remaining_time -= duration
                else:
                    subscription.remaining_time = 0
            # If remaining_time is now 0 or less, deactivate the subscription
            if subscription.remaining_time is not None and subscription.remaining_time <= 0:
                subscription.is_active = False
            session.add(subscription)
            session.commit()
        
        return active_visit

    else:
        # No active visit – so verify subscription validity and check in.
        if not client.group_id:
            raise HTTPException(status_code=400, detail="Client is not assigned to a group with a subscription")
        
        subscription = session.exec(
            select(Subscription)
            .where(Subscription.client_group_id == client.group_id)
            .where(Subscription.is_active == True)
        ).first()
        if not subscription:
            raise HTTPException(status_code=400, detail="No active subscription found for this client's group")
        
        new_visit = Visit(
            client_id=client_id,
            check_in=datetime.utcnow(),
            subscription_id=subscription.id
        )
        session.add(new_visit)
        session.commit()
        session.refresh(new_visit)
        return new_visit
    


@router.get("/all-visits", response_model=list[VisitPublic])
def get_all_visits(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    statement = select(Visit).offset(skip).limit(limit)
    visits = session.exec(statement).all()
    return visits


@router.get("/all-payments", response_model=list[VisitPublic])
def get_all_visits(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    statement = select(Payment).offset(skip).limit(limit)
    payments = session.exec(statement).all()
    return payments


@router.get("/all-subscriptions", response_model=list[SubscriptionPublic])
def get_all_visits(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    statement = select(Subscription).offset(skip).limit(limit)
    subscriptions = session.exec(statement).all()
    return subscriptions


@router.get("/all-active-visits", response_model=list[VisitPublic])
def get_all_active_visits(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    statement = select(Visit).where(Visit.check_out == None).offset(skip).limit(limit)
    visits = session.exec(statement).all()
    return visits
   

@router.post("/plans", response_model=Plan)
def create_plan(
    *, session: SessionDep, current_user: GetAdminUser, plan_in: PlanCreate
) -> Any:
    """Create a new service plan"""
    plan = Plan.model_validate(plan_in)

    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan

@router.put("/subscriptions/{subscription_id}/approve", response_model=Subscription)
def approve_subscription(
    *, session: SessionDep, current_user: GetAdminUser, subscription_id: uuid.UUID
) -> Any:
    """Approve a subscription"""
    subscription = session.get(Subscription, subscription_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    subscription.approved_by = current_user.id
    subscription.is_active = True
    
    session.add(subscription)
    session.commit()
    session.refresh(subscription)
    return subscription




@router.post("/subscriptions/force-create", response_model=Subscription)
def force_create_subscription(
    *, session: SessionDep, current_user: GetAdminUser, client_group_id: uuid.UUID, subscription_in: SubscriptionCreate
) -> Any:
    """Forces the creation of a subscription to a client group"""
    subscription = Subscription.model_validate(subscription_in)
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    
    session.add(subscription)
    session.commit()
    session.refresh(subscription)
    return subscription


@router.get("/dashboard/metrics")
def get_dashboard_metrics(
    session: SessionDep, current_user: GetAdminUser
) -> Any:
    """Get comprehensive dashboard metrics"""
    current_date = datetime.utcnow()
    start_date = current_date - timedelta(days=7)
    
    # Active clients count
    active_clients = session.exec(
        select(func.count(Client.id)).where(Client.is_active == True)
    ).one()
    
    # Current visits
    current_visits = session.exec(
        select(func.count(Visit.id))
        .where(Visit.check_out == None)
    ).one()
    
    # Today's revenue
    today_revenue = session.exec(
        select(func.sum(Payment.amount))
        .where(func.date(Payment.created_at) == func.date(current_date))
        .where(Payment.status == "completed")
    ).one() or 0
    
    # Visits by day (for chart data)
    visits_grouped = session.exec(
        select(
            func.date(Visit.check_in).label("day"),
            func.count(Visit.id).label("visit_count")
        )
        .where(Visit.check_in >= start_date)
        .group_by(func.date(Visit.check_in))
        .order_by("day")
    ).all()
    
    # Convert the result into a list of dictionaries
    visits_chart_data = [
        {"day": day.isoformat(), "visit_count": visit_count}
        for day, visit_count in visits_grouped
    ]
    
    # Revenue by day
    revenue_grouped = session.exec(
        select(
            func.date(Payment.created_at).label("day"),
            func.sum(Payment.amount).label("amount")
        )
        .where(Payment.created_at >= start_date)
        .where(Payment.status == "completed")
        .group_by(func.date(Payment.created_at))
        .order_by("day")
    ).all()
    
    # Convert the result into a list of dictionaries
    revenue_chart_data = [
        {"day": day.isoformat(), "amount": float(amount)}
        for day, amount in revenue_grouped
    ]
    
    # Subscription stats
    active_subscriptions = session.exec(
        select(func.count(Subscription.id))
        .where(Subscription.is_active == True)
    ).one()
    
    expired_subscriptions = session.exec(
        select(func.count(Subscription.id))
        .where(Subscription.is_active == False)
    ).one()
    
    expiring_soon_date = current_date + timedelta(days=7)
    expiring_soon_subscriptions = session.exec(
        select(func.count(Subscription.id))
        .where(Subscription.is_active == True)
        .where(Subscription.end_date <= expiring_soon_date)
        .where(Subscription.end_date > current_date)
    ).one()
    
    # Top plans
    top_plans = session.exec(
        select(
            Plan.id,
            Plan.name,
            func.count(Subscription.id).label("subscription_count")
        )
        .join(Subscription, Plan.id == Subscription.plan_id)
        .where(Subscription.is_active == True)
        .group_by(Plan.id, Plan.name)
        .order_by(desc("subscription_count"))
        .limit(4)
    ).all()
    
    top_plans_data = [
        {"id": str(id), "name": name, "subscriptions": count}
        for id, name, count in top_plans
    ]
    
    return {
        "active_clients": active_clients,
        "current_visits": current_visits,
        "today_revenue": today_revenue,
        "visits_by_day": visits_chart_data,
        "revenue_by_day": revenue_chart_data,
        "subscription_stats": {
            "active": active_subscriptions,
            "expired": expired_subscriptions,
            "expiring_soon": expiring_soon_subscriptions
        },
        "top_plans": top_plans_data
    }

# Define a response model for active visits with client info
class VisitWithClientInfo(SQLModel):
    id: uuid.UUID
    client_id: uuid.UUID
    check_in: datetime
    client_name: str
    subscription_id: Optional[uuid.UUID] = None

# Enhanced active visits endpoint
@router.get("/all-active-visits", response_model=list[VisitWithClientInfo])
def get_all_active_visits(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all active visits with client information"""
    visits_query = (
        select(Visit, Client.full_name.label("client_name"))
        .join(Client, Visit.client_id == Client.id)
        .where(Visit.check_out == None)
        .offset(skip)
        .limit(limit)
        .order_by(desc(Visit.check_in))  # Most recent first
    )
    
    active_visits_with_client = session.exec(visits_query).all()
    
    # Create response objects with client info
    result = []
    for visit, client_name in active_visits_with_client:
        result.append(
            VisitWithClientInfo(
                id=visit.id,
                client_id=visit.client_id,
                check_in=visit.check_in,
                client_name=client_name,
                subscription_id=visit.subscription_id
            )
        )
    
    return result

# Get all plans endpoint
@router.get("/plans", response_model=list[Plan])
def get_all_plans(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False
) -> Any:
    """Get all service plans"""
    statement = select(Plan)
    
    if active_only:
        statement = statement.where(Plan.is_active == True)
    
    statement = statement.offset(skip).limit(limit).order_by(Plan.name)
    plans = session.exec(statement).all()
    return plans

# Get all reservations endpoint
@router.get("/all-reservations", response_model=list[ReservationPublic])
def get_all_reservations(
    session: SessionDep,
    current_user: GetAdminUser,
    skip: int = 0,
    limit: int = 100,
    upcoming_only: bool = False
) -> Any:
    """Get all reservations"""
    statement = select(Reservation)
    
    if upcoming_only:
        current_date = datetime.utcnow()
        statement = statement.where(Reservation.date >= current_date)
    
    statement = statement.offset(skip).limit(limit).order_by(Reservation.date)
    reservations = session.exec(statement).all()
    return reservations
# Get client_groups