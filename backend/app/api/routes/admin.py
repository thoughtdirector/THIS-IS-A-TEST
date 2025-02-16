from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import select, func
from typing import Any
from datetime import datetime
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models import (
    Client,  Visit, Notification, NotificationCreate,
    Plan, Subscription, Payment, ClientPublic, PlanCreate, VisitPublic, QRCode, SubscriptionCreate
)
import uuid
from typing import Optional, List, Dict, Any

router = APIRouter()

@router.get("/dashboard/metrics")
def get_dashboard_metrics(
    session: SessionDep, current_user: GetAdminUser
) -> Any:
    """Get real-time dashboard metrics"""
    current_date = datetime.utcnow()
    
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
    ).one() or 0
    
    # Visits by day (for chart data)
    visits_grouped = session.exec(
        select(
            func.date(Visit.check_in).label("day"),
            func.count(Visit.id).label("visit_count")
        )
        .group_by(func.date(Visit.check_in))
    ).all()
    
    # Convert the result into a list of dictionaries
    visits_chart_data = [
        {"day": day, "visit_count": visit_count}
        for day, visit_count in visits_grouped
    ]
    
    return {
        "active_clients": active_clients,
        "current_visits": current_visits,
        "today_revenue": today_revenue,
        "visits_by_day": visits_chart_data,
    }


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



# Get client_groups