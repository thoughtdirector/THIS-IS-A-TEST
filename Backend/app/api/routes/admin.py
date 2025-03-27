from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select, func
from typing import Any, Optional, List
from datetime import datetime, timedelta
import uuid
import os
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models.role import Role
from app.models.user import User
from app.models.child import Child
from app.models.credit import Credit
from app.models.visit import Visit
from app.models.location import Location
from app.models.zone import Zone
from app.models.service import Service
from app.models.session import Session as ServiceSession
from app.models.order import Order
from app.models.order_item import OrderItem

router = APIRouter()

# Admin dashboard overview
@router.get("/overview", response_model=dict)
def get_admin_overview(
    session: SessionDep,
    current_user: GetAdminUser,
    location_id: Optional[int] = None
) -> Any:
    """Get a quick overview of key metrics for admins"""
    # Filter by location if provided
    location_filter = []
    if location_id:
        location_filter.append(Visit.location_id == location_id)
    
    # Active visits
    active_visits = session.exec(
        select(func.count(Visit.visit_id))
        .where(Visit.check_out_time == None)
        .where(*location_filter)
    ).one() or 0
    
    # Today's revenue
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    if location_id:
        today_revenue = session.exec(
            select(func.sum(Order.total))
            .where(Order.order_date >= today)
            .where(Order.payment_status == "completed")
            .where(Order.location_id == location_id)
        ).one() or 0
    else:
        today_revenue = session.exec(
            select(func.sum(Order.total))
            .where(Order.order_date >= today)
            .where(Order.payment_status == "completed")
        ).one() or 0
    
    # Today's visits
    today_visits = session.exec(
        select(func.count(Visit.visit_id))
        .where(Visit.check_in_time >= today)
        .where(*location_filter)
    ).one() or 0
    
    # Get parent role
    parent_role = session.exec(
        select(Role).where(Role.role_name == "parent")
    ).first()
    
    # New users today
    if parent_role:
        new_users = session.exec(
            select(func.count(User.user_id))
            .where(User.role_id == parent_role.role_id)
            .where(User.created_at >= today)
        ).one() or 0
    else:
        new_users = 0
    
    # Location occupancy if location provided
    location_occupancy = None
    if location_id:
        location = session.get(Location, location_id)
        if location:
            # Calculate total capacity
            total_capacity = session.exec(
                select(func.sum(Zone.max_capacity))
                .where(Zone.location_id == location_id)
                .where(Zone.is_active == True)
            ).one() or 0
            
            if total_capacity > 0:
                occupancy_percentage = (active_visits / total_capacity) * 100
                location_occupancy = {
                    "current_visitors": active_visits,
                    "total_capacity": total_capacity,
                    "percentage": round(occupancy_percentage, 1)
                }
    
    return {
        "active_visits": active_visits,
        "today_revenue": float(today_revenue),
        "today_visits": today_visits,
        "new_users_today": new_users,
        "location_occupancy": location_occupancy,
        "last_updated": datetime.utcnow().isoformat()
    }

# Admin location management
@router.get("/locations", response_model=List[dict])
def get_all_locations(
    session: SessionDep,
    current_user: GetAdminUser
) -> Any:
    """Get all locations with basic metrics"""
    locations = session.exec(
        select(Location)
    ).all()
    
    result = []
    for location in locations:
        # Get active visits for this location
        active_visits = session.exec(
            select(func.count(Visit.visit_id))
            .where(Visit.location_id == location.location_id)
            .where(Visit.check_out_time == None)
        ).one() or 0
        
        # Get total capacity
        total_capacity = session.exec(
            select(func.sum(Zone.max_capacity))
            .where(Zone.location_id == location.location_id)
            .where(Zone.is_active == True)
        ).one() or 0
        
        # Get zones count
        zones_count = session.exec(
            select(func.count(Zone.zone_id))
            .where(Zone.location_id == location.location_id)
            .where(Zone.is_active == True)
        ).one() or 0
        
        # Get services count
        services_count = session.exec(
            select(func.count(Service.service_id))
            .where(Service.location_id == location.location_id)
            .where(Service.is_active == True)
        ).one() or 0
        
        result.append({
            "location_id": location.location_id,
            "name": location.name,
            "address": location.address,
            "city": location.city,
            "state": location.state,
            "active_visits": active_visits,
            "total_capacity": total_capacity,
            "zones_count": zones_count,
            "services_count": services_count,
            "is_active": location.is_active
        })
    
    return result

# Active visits management
@router.get("/active-visits", response_model=List[dict])
def get_all_active_visits(
    session: SessionDep,
    current_user: GetAdminUser,
    location_id: Optional[int] = None
) -> Any:
    """Get all active visits across all locations"""
    # Build query
    query = (
        select(Visit, Child, User, Zone)
        .join(Child, Visit.child_id == Child.child_id)
        .join(User, Child.parent_id == User.user_id)
        .outerjoin(Zone, Visit.zone_id == Zone.zone_id)
        .where(Visit.check_out_time == None)
    )
    
    if location_id:
        query = query.where(Visit.location_id == location_id)
    
    active_visits = session.exec(query).all()
    
    result = []
    for visit, child, parent, zone in active_visits:
        # Calculate current duration
        current_duration = None
        if visit.check_in_time:
            delta = datetime.utcnow() - visit.check_in_time
            current_duration = int(delta.total_seconds() / 60)
        
        visit_data = {
            "visit_id": visit.visit_id,
            "child": {
                "child_id": child.child_id,
                "fullname": child.fullname,
                "birth_date": child.birth_date
            },
            "parent": {
                "user_id": parent.user_id,
                "fullname": parent.fullname,
                "email": parent.email,
                "phone": parent.phone
            },
            "zone": {
                "zone_id": zone.zone_id,
                "name": zone.name
            } if zone else None,
            "visit_type": visit.visit_type,
            "check_in_time": visit.check_in_time,
            "current_duration_minutes": current_duration
        }
        result.append(visit_data)
    
    return result

# Admin check-out 
@router.post("/check-out/{visit_id}", response_model=dict)
def admin_check_out(
    *, session: SessionDep, current_user: GetAdminUser, visit_id: int
) -> Any:
    """Process check-out for a visit"""
    visit = session.get(Visit, visit_id)
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    if visit.check_out_time:
        raise HTTPException(status_code=400, detail="Visit already checked out")
    
    # Record check-out
    check_out_time = datetime.utcnow()
    visit.check_out_time = check_out_time
    visit.check_out_by = current_user.user_id
    
    # Calculate minutes used
    if visit.check_in_time:
        delta = check_out_time - visit.check_in_time
        minutes_used = int(delta.total_seconds() / 60)
        visit.minutes_used = minutes_used
        
        # If this is a play_time visit with a credit, deduct from credit
        if visit.visit_type == "play_time" and visit.credit_id:
            credit = session.get(Credit, visit.credit_id)
            if credit:
                # Deduct minutes, don't go below zero
                credit.minutes_remaining = max(0, credit.minutes_remaining - minutes_used)
                session.add(credit)
    
    session.add(visit)
    session.commit()
    session.refresh(visit)
    
    return {
        "visit_id": visit.visit_id,
        "check_out_time": visit.check_out_time,
        "minutes_used": visit.minutes_used,
        "message": "Visit checked out successfully"
    }

# Change zone for active visit
@router.put("/change-zone/{visit_id}", response_model=dict)
def change_visit_zone(
    *, session: SessionDep, current_user: GetAdminUser, visit_id: int, zone_id: int
) -> Any:
    """Change the zone for an active visit"""
    visit = session.get(Visit, visit_id)
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    if visit.check_out_time:
        raise HTTPException(status_code=400, detail="Cannot change zone for completed visit")
    
    # Verify zone exists in the same location
    zone = session.get(Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    if zone.location_id != visit.location_id:
        raise HTTPException(status_code=400, detail="Zone must be in the same location as the visit")
    
    # Update zone
    visit.zone_id = zone_id
    session.add(visit)
    session.commit()
    session.refresh(visit)
    
    return {
        "visit_id": visit.visit_id,
        "zone_id": visit.zone_id,
        "message": "Visit zone updated successfully"
    }

# Admin search
@router.get("/search", response_model=dict)
def admin_search(
    session: SessionDep,
    current_user: GetAdminUser,
    query: str
) -> Any:
    """Search for users, children, or visits"""
    if len(query) < 3:
        raise HTTPException(status_code=400, detail="Search query must be at least 3 characters")
    
    search_term = f"%{query}%"
    
    # Search parents
    parent_role = session.exec(
        select(Role).where(Role.role_name == "parent")
    ).first()
    
    parents = []
    if parent_role:
        parents_query = (
            select(User)
            .where(User.role_id == parent_role.role_id)
            .where(
                (User.fullname.like(search_term)) |
                (User.email.like(search_term)) |
                (User.document_number.like(search_term))
            )
            .limit(5)
        )
        
        parents_results = session.exec(parents_query).all()
        
        for parent in parents_results:
            # Count children
            children_count = session.exec(
                select(func.count(Child.child_id))
                .where(Child.parent_id == parent.user_id)
            ).one()
            
            parents.append({
                "user_id": parent.user_id,
                "fullname": parent.fullname,
                "email": parent.email,
                "phone": parent.phone,
                "children_count": children_count
            })
    
    # Search children
    children_query = (
        select(Child, User)
        .join(User, Child.parent_id == User.user_id)
        .where(Child.fullname.like(search_term))
        .limit(5)
    )
    
    children_results = session.exec(children_query).all()
    
    children = []
    for child, parent in children_results:
        children.append({
            "child_id": child.child_id,
            "fullname": child.fullname,
            "birth_date": child.birth_date,
            "parent": {
                "user_id": parent.user_id,
                "fullname": parent.fullname,
                "email": parent.email
            }
        })
    
    # Search visits (by child name)
    recent_visits_query = (
        select(Visit, Child)
        .join(Child, Visit.child_id == Child.child_id)
        .where(Child.fullname.like(search_term))
        .order_by(Visit.check_in_time.desc())
        .limit(5)
    )
    
    visits_results = session.exec(recent_visits_query).all()
    
    visits = []
    for visit, child in visits_results:
        visits.append({
            "visit_id": visit.visit_id,
            "child_id": child.child_id,
            "child_name": child.fullname,
            "check_in_time": visit.check_in_time,
            "check_out_time": visit.check_out_time,
            "visit_type": visit.visit_type,
            "status": "active" if not visit.check_out_time else "completed"
        })
    
    return {
        "parents": parents,
        "children": children,
        "visits": visits,
        "query": query
    }

# Admin Reports
@router.get("/reports/daily", response_model=dict)
def get_daily_report(
    session: SessionDep,
    current_user: GetAdminUser,
    location_id: Optional[int] = None,
    date: Optional[str] = None
) -> Any:
    """Get daily report with visits and revenue"""
    # Set date to today if not provided
    if not date:
        report_date = datetime.utcnow().date()
    else:
        report_date = datetime.fromisoformat(date).date()
    
    start_datetime = datetime.combine(report_date, datetime.min.time())
    end_datetime = datetime.combine(report_date, datetime.max.time())
    
    # Location filter
    location_filter = []
    if location_id:
        location_filter.append(Visit.location_id == location_id)
    
    # Total visits
    total_visits = session.exec(
        select(func.count(Visit.visit_id))
        .where(Visit.check_in_time.between(start_datetime, end_datetime))
        .where(*location_filter)
    ).one() or 0
    
    # Visits by type
    visit_types = session.exec(
        select(Visit.visit_type, func.count(Visit.visit_id))
        .where(Visit.check_in_time.between(start_datetime, end_datetime))
        .where(*location_filter)
        .group_by(Visit.visit_type)
    ).all()
    
    visits_by_type = {visit_type: count for visit_type, count in visit_types}
    
    # Visits by hour
    visits_by_hour = session.exec(
        select(
            func.extract('hour', Visit.check_in_time).label("hour"),
            func.count(Visit.visit_id)
        )
        .where(Visit.check_in_time.between(start_datetime, end_datetime))
        .where(*location_filter)
        .group_by(func.extract('hour', Visit.check_in_time))
        .order_by("hour")
    ).all()
    
    hourly_visits = {str(int(hour)): count for hour, count in visits_by_hour}
    
    # Revenue data
    if location_id:
        daily_revenue = session.exec(
            select(func.sum(Order.total))
            .where(Order.order_date.between(start_datetime, end_datetime))
            .where(Order.payment_status == "completed")
            .where(Order.location_id == location_id)
        ).one() or 0
    else:
        daily_revenue = session.exec(
            select(func.sum(Order.total))
            .where(Order.order_date.between(start_datetime, end_datetime))
            .where(Order.payment_status == "completed")
        ).one() or 0
    
    # Revenue by payment method
    payment_methods = session.exec(
        select(Order.payment_method, func.sum(Order.total))
        .where(Order.order_date.between(start_datetime, end_datetime))
        .where(Order.payment_status == "completed")
        .where(*[Order.location_id == location_id] if location_id else [])
        .group_by(Order.payment_method)
    ).all()
    
    revenue_by_method = {method: float(amount) for method, amount in payment_methods}
    
    # New users
    parent_role = session.exec(
        select(Role).where(Role.role_name == "parent")
    ).first()
    
    if parent_role:
        new_users = session.exec(
            select(func.count(User.user_id))
            .where(User.role_id == parent_role.role_id)
            .where(User.created_at.between(start_datetime, end_datetime))
        ).one() or 0
    else:
        new_users = 0
    
    return {
        "date": report_date.isoformat(),
        "total_visits": total_visits,
        "visits_by_type": visits_by_type,
        "hourly_visits": hourly_visits,
        "daily_revenue": float(daily_revenue),
        "revenue_by_payment_method": revenue_by_method,
        "new_users": new_users,
        "location_id": location_id
    }

@router.get("/reports/monthly", response_model=dict)
def get_monthly_report(
    session: SessionDep,
    current_user: GetAdminUser,
    location_id: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None
) -> Any:
    """Get monthly report with visits and revenue"""
    # Set to current year/month if not provided
    current_date = datetime.utcnow()
    if not year:
        year = current_date.year
    if not month:
        month = current_date.month
    
    # Start and end of month
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1) - timedelta(days=1)
    
    end_date = datetime.combine(end_date, datetime.max.time())
    
    # Location filter
    location_filter = []
    if location_id:
        location_filter.append(Visit.location_id == location_id)
    
    # Total visits
    total_visits = session.exec(
        select(func.count(Visit.visit_id))
        .where(Visit.check_in_time.between(start_date, end_date))
        .where(*location_filter)
    ).one() or 0
    
    # Visits by day
    visits_by_day = session.exec(
        select(
            func.extract('day', Visit.check_in_time).label("day"),
            func.count(Visit.visit_id)
        )
        .where(Visit.check_in_time.between(start_date, end_date))
        .where(*location_filter)
        .group_by(func.extract('day', Visit.check_in_time))
        .order_by("day")
    ).all()
    
    daily_visits = {str(int(day)): count for day, count in visits_by_day}
    
    # Visits by type
    visit_types = session.exec(
        select(Visit.visit_type, func.count(Visit.visit_id))
        .where(Visit.check_in_time.between(start_date, end_date))
        .where(*location_filter)
        .group_by(Visit.visit_type)
    ).all()
    
    visits_by_type = {visit_type: count for visit_type, count in visit_types}
    
    # Revenue data
    if location_id:
        monthly_revenue = session.exec(
            select(func.sum(Order.total))
            .where(Order.order_date.between(start_date, end_date))
            .where(Order.payment_status == "completed")
            .where(Order.location_id == location_id)
        ).one() or 0
    else:
        monthly_revenue = session.exec(
            select(func.sum(Order.total))
            .where(Order.order_date.between(start_date, end_date))
            .where(Order.payment_status == "completed")
        ).one() or 0
    
    # Revenue by day
    revenue_by_day = session.exec(
        select(
            func.extract('day', Order.order_date).label("day"),
            func.sum(Order.total)
        )
        .where(Order.order_date.between(start_date, end_date))
        .where(Order.payment_status == "completed")
        .where(*[Order.location_id == location_id] if location_id else [])
        .group_by(func.extract('day', Order.order_date))
        .order_by("day")
    ).all()
    
    daily_revenue = {str(int(day)): float(amount) for day, amount in revenue_by_day}
    
    # New users
    parent_role = session.exec(
        select(Role).where(Role.role_name == "parent")
    ).first()
    
    if parent_role:
        new_users = session.exec(
            select(func.count(User.user_id))
            .where(User.role_id == parent_role.role_id)
            .where(User.created_at.between(start_date, end_date))
        ).one() or 0
    else:
        new_users = 0
    
    return {
        "year": year,
        "month": month,
        "total_visits": total_visits,
        "visits_by_day": daily_visits,
        "visits_by_type": visits_by_type,
        "monthly_revenue": float(monthly_revenue),
        "revenue_by_day": daily_revenue,
        "new_users": new_users,
        "location_id": location_id
    }

# Session schedule management
@router.get("/schedule", response_model=List[dict])
def get_service_schedule(
    session: SessionDep,
    current_user: GetAdminUser,
    location_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Any:
    """Get schedule of all service sessions"""
    # Default date range is next 7 days
    if not start_date:
        start = datetime.utcnow()
    else:
        start = datetime.fromisoformat(start_date)
    
    if not end_date:
        end = start + timedelta(days=7)
    else:
        end = datetime.fromisoformat(end_date)
    
    # Build query
    query = (
        select(ServiceSession, Service, User, Zone)
        .join(Service, ServiceSession.service_id == Service.service_id)
        .outerjoin(User, ServiceSession.staff_id == User.user_id)
        .outerjoin(Zone, Service.zone_id == Zone.zone_id)
        .where(ServiceSession.start_time.between(start, end))
    )
    
    if location_id:
        query = query.where(Service.location_id == location_id)
    
    query = query.order_by(ServiceSession.start_time)
    schedule = session.exec(query).all()
    
    result = []
    for session_obj, service, staff, zone in schedule:
        # Count current bookings
        bookings = session.exec(
            select(func.count(Visit.visit_id))
            .where(Visit.session_id == session_obj.session_id)
        ).one() or 0
        
        result.append({
            "session_id": session_obj.session_id,
            "service": {
                "service_id": service.service_id,
                "name": service.name,
                "service_type": service.service_type
            },
            "start_time": session_obj.start_time,
            "end_time": session_obj.end_time,
            "staff": {
                "user_id": staff.user_id,
                "fullname": staff.fullname
            } if staff else None,
            "zone": {
                "zone_id": zone.zone_id,
                "name": zone.name
            } if zone else None,
            "bookings": bookings,
            "max_capacity": session_obj.max_capacity,
            "availability": session_obj.max_capacity - bookings,
            "is_canceled": session_obj.is_canceled
        })
    
    return result