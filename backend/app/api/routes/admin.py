from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import select, func
from typing import Any
from datetime import datetime
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models import (
    Client,  Visit, Notification, NotificationCreate,
    Plan, Subscription, Payment, ClientPublic, PlanCreate, VisitPublic
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
@router.post("/visits/check-in", response_model=Visit) #  Need to check subscription validity & if the user already has a visit active
def check_in_client(
    *, session: SessionDep, current_user: GetAdminUser, client_id: uuid.UUID, check_in: Optional[datetime] = None
) -> Any:
    """Check in a client using QR code"""
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    visit = Visit(
        client_id=client_id,
        checked_in_by=current_user.id,
        qr_scanned=True
    )

    if check_in is not None:
        visit.check_in = check_in
    session.add(visit)
    session.commit()
    session.refresh(visit)
    return visit

@router.put("/visits/{visit_id}/check-out", response_model=Visit)
def check_out_client(
    *, session: SessionDep, current_user: GetAdminUser, visit_id: uuid.UUID
) -> Any:
    """Check out a client"""
    visit = session.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit.check_out:
        raise HTTPException(status_code=401, detail="Visit has already ended")
    check_out = datetime.utcnow()
    visit.check_out = check_out
    visit.checked_out_by = current_user.id
    duration = (check_out - visit.check_in).total_seconds()
    
    visit.duration = duration
    
    session.add(visit)
    session.commit()
    session.refresh(visit)

    subscription = session.exec(
        select(Subscription)
        .where(Subscription.client_id == visit.client_id)
        .where(Subscription.is_active == True)
    ).first()

    if subscription and subscription.remaining_time  >= duration:
        subscription.remaining_time -= duration
        if subscription.remaining_time <= 0:
            subscription.is_active = False
        session.add(subscription)
        session.commit()
    
    
    return visit

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
    plan.created_by = current_user.id
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