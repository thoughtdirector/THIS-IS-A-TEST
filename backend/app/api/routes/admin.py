from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import select, func
from typing import Any
from datetime import datetime
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models import (
    Client,  Visit, Notification,
    Plan, Subscription, Payment
)
import uuid

admin_router = APIRouter()

# Dashboard Routes
@admin_router.get("/dashboard/metrics")
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
    
    return {
        "active_clients": active_clients,
        "current_visits": current_visits,
        "today_revenue": today_revenue
    }

# Client Management Routes
@admin_router.get("/clients", response_model=list[ClientPublic])
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

@admin_router.post("/notifications", response_model=Notification)
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
@admin_router.post("/visits/check-in", response_model=Visit)
def check_in_client(
    *, session: SessionDep, current_user: GetAdminUser, client_id: uuid.UUID
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
    session.add(visit)
    session.commit()
    session.refresh(visit)
    return visit

@admin_router.put("/visits/{visit_id}/check-out", response_model=Visit)
def check_out_client(
    *, session: SessionDep, current_user: GetAdminUser, visit_id: uuid.UUID
) -> Any:
    """Check out a client"""
    visit = session.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    visit.check_out = datetime.utcnow()
    visit.checked_out_by = current_user.id
    session.refresh(visit)
    duration = (visit.check_out - visit.check_in)
    
    visit.duration = duration
    
    session.add(visit)
    session.commit()
    session.refresh(visit)

    subscription = session.exec(
        select(Subscription)
        .where(Subscription.client_id == visit.client_id)
        .where(Subscription.is_active == True)
    ).first()

    if subscription and subscription.remaining_hours >= duration:
        subscription.remaining_hours -= duration
        if subscription.remaining_hours <= 0:
            subscription.is_active = False
        session.add(subscription)
        session.commit()
    
    
    return visit

@admin_router.post("/plans", response_model=Plan)
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

@admin_router.put("/subscriptions/{subscription_id}/approve", response_model=Subscription)
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