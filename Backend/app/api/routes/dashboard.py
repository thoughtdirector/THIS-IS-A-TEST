from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import select, func
from typing import Any, Optional
from datetime import datetime, timedelta
from app.api.deps import GetAdminUser, SessionDep
from app.models.visit import Visit
from app.models.user import User
from app.models.role import Role
from app.models.child import Child
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.location import Location
from app.models.zone import Zone
from app.models.credit import Credit

router = APIRouter()

@router.get("/metrics", response_model=dict)
def get_dashboard_metrics(
    session: SessionDep, 
    current_user: GetAdminUser,
    location_id: Optional[int] = None,
    days: int = 30
) -> Any:
    """Get comprehensive dashboard metrics"""
    current_date = datetime.utcnow()
    start_date = current_date - timedelta(days=days)
    
    # Apply location filter to all queries if provided
    location_filter = []
    if location_id:
        location_filter.append(Visit.location_id == location_id)
    
    # Active users (parents) with activity in the last 30 days
    parent_role = session.exec(
        select(Role).where(Role.role_name == "parent")
    ).first()
    
    if parent_role:
        active_parents = session.exec(
            select(func.count(User.user_id.distinct()))
            .join(Child, User.user_id == Child.parent_id)
            .join(Visit, Child.child_id == Visit.child_id)
            .where(User.role_id == parent_role.role_id)
            .where(Visit.check_in_time >= start_date)
            .where(*location_filter)
        ).one() or 0
    else:
        active_parents = 0
    
    # Current visits
    current_visits = session.exec(
        select(func.count(Visit.visit_id))
        .where(Visit.check_out_time == None)
        .where(*location_filter)
    ).one() or 0
    
    # Today's revenue
    today_start = current_date.replace(hour=0, minute=0, second=0, microsecond=0)
    if location_id:
        today_revenue = session.exec(
            select(func.sum(Order.total))
            .where(func.date(Order.order_date) == func.date(current_date))
            .where(Order.payment_status == "completed")
            .where(Order.location_id == location_id)
        ).one() or 0
    else:
        today_revenue = session.exec(
            select(func.sum(Order.total))
            .where(func.date(Order.order_date) == func.date(current_date))
            .where(Order.payment_status == "completed")
        ).one() or 0
    
    # New registrations today
    if parent_role:
        new_users_today = session.exec(
            select(func.count(User.user_id))
            .where(User.role_id == parent_role.role_id)
            .where(func.date(User.created_at) == func.date(current_date))
        ).one() or 0
    else:
        new_users_today = 0
    
    # Visits by day (for chart data)
    visits_by_day = []
    for i in range(days):
        day_date = start_date + timedelta(days=i)
        next_day = day_date + timedelta(days=1)
        
        day_visits = session.exec(
            select(func.count(Visit.visit_id))
            .where(Visit.check_in_time >= day_date)
            .where(Visit.check_in_time < next_day)
            .where(*location_filter)
        ).one() or 0
        
        visits_by_day.append({
            "date": day_date.date().isoformat(),
            "visits": day_visits
        })
    
    # Revenue by day
    revenue_by_day = []
    for i in range(days):
        day_date = start_date + timedelta(days=i)
        next_day = day_date + timedelta(days=1)
        
        if location_id:
            day_revenue = session.exec(
                select(func.sum(Order.total))
                .where(Order.order_date >= day_date)
                .where(Order.order_date < next_day)
                .where(Order.payment_status == "completed")
                .where(Order.location_id == location_id)
            ).one() or 0
        else:
            day_revenue = session.exec(
                select(func.sum(Order.total))
                .where(Order.order_date >= day_date)
                .where(Order.order_date < next_day)
                .where(Order.payment_status == "completed")
            ).one() or 0
        
        revenue_by_day.append({
            "date": day_date.date().isoformat(),
            "revenue": float(day_revenue)
        })
    
    # Most popular zones
    if location_id:
        zone_visits = session.exec(
            select(Zone.zone_id, Zone.name, func.count(Visit.visit_id).label("visit_count"))
            .join(Visit, Zone.zone_id == Visit.zone_id)
            .where(Visit.check_in_time >= start_date)
            .where(Zone.location_id == location_id)
            .group_by(Zone.zone_id, Zone.name)
            .order_by(func.count(Visit.visit_id).desc())
            .limit(5)
        ).all()
    else:
        zone_visits = session.exec(
            select(Zone.zone_id, Zone.name, func.count(Visit.visit_id).label("visit_count"))
            .join(Visit, Zone.zone_id == Visit.zone_id)
            .where(Visit.check_in_time >= start_date)
            .group_by(Zone.zone_id, Zone.name)
            .order_by(func.count(Visit.visit_id).desc())
            .limit(5)
        ).all()
    
    top_zones = [
        {"zone_id": zone_id, "name": name, "visits": count}
        for zone_id, name, count in zone_visits
    ]
    
    # Visit types distribution
    visit_types = session.exec(
        select(Visit.visit_type, func.count(Visit.visit_id))
        .where(Visit.check_in_time >= start_date)
        .where(*location_filter)
        .group_by(Visit.visit_type)
    ).all()
    
    visit_types_distribution = {
        visit_type: count
        for visit_type, count in visit_types
    }
    
    # Average visit duration
    avg_duration = session.exec(
        select(func.avg(Visit.minutes_used))
        .where(Visit.check_in_time >= start_date)
        .where(Visit.check_out_time != None)
        .where(*location_filter)
    ).one() or 0
    
    return {
        "active_parents": active_parents,
        "current_visits": current_visits,
        "today_revenue": float(today_revenue),
        "new_users_today": new_users_today,
        "avg_visit_duration_minutes": round(avg_duration),
        "visits_by_day": visits_by_day,
        "revenue_by_day": revenue_by_day,
        "top_zones": top_zones,
        "visit_types_distribution": visit_types_distribution,
        "date_range": {
            "start_date": start_date.date().isoformat(),
            "end_date": current_date.date().isoformat(),
            "days": days
        }
    }

@router.get("/capacity", response_model=dict)
def get_current_capacity(
    session: SessionDep, 
    current_user: GetAdminUser,
    location_id: int
) -> Any:
    """Get real-time capacity metrics for a location"""
    location = session.get(Location, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Get all zones for this location
    zones = session.exec(
        select(Zone)
        .where(Zone.location_id == location_id)
        .where(Zone.is_active == True)
    ).all()
    
    zones_data = []
    total_capacity = 0
    total_current = 0
    
    for zone in zones:
        # Count current visitors in this zone
        current_visitors = session.exec(
            select(func.count(Visit.visit_id))
            .where(Visit.zone_id == zone.zone_id)
            .where(Visit.check_out_time == None)
        ).one() or 0
        
        usage_percentage = (current_visitors / zone.max_capacity * 100) if zone.max_capacity > 0 else 0
        
        zones_data.append({
            "zone_id": zone.zone_id,
            "name": zone.name,
            "max_capacity": zone.max_capacity,
            "current_visitors": current_visitors,
            "available": zone.max_capacity - current_visitors,
            "usage_percentage": round(usage_percentage, 1)
        })
        
        total_capacity += zone.max_capacity
        total_current += current_visitors
    
    # Total location capacity
    overall_usage = (total_current / total_capacity * 100) if total_capacity > 0 else 0
    
    return {
        "location_id": location_id,
        "location_name": location.name,
        "total_capacity": total_capacity,
        "current_visitors": total_current,
        "available_capacity": total_capacity - total_current,
        "usage_percentage": round(overall_usage, 1),
        "zones": zones_data
    }

@router.get("/revenue", response_model=dict)
def get_revenue_metrics(
    session: SessionDep, 
    current_user: GetAdminUser,
    location_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Any:
    """Get detailed revenue metrics"""
    # Set default date range if not provided
    if not start_date:
        start = datetime.utcnow() - timedelta(days=30)
    else:
        start = datetime.fromisoformat(start_date)
    
    if not end_date:
        end = datetime.utcnow()
    else:
        end = datetime.fromisoformat(end_date)
    
    # Base query filters
    location_filter = []
    if location_id:
        location_filter.append(Order.location_id == location_id)
    
    # Total revenue
    total_revenue = session.exec(
        select(func.sum(Order.total))
        .where(Order.order_date.between(start, end))
        .where(Order.payment_status == "completed")
        .where(*location_filter)
    ).one() or 0
    
    # Revenue by payment method
    revenue_by_method = session.exec(
        select(
            Order.payment_method,
            func.sum(Order.total).label("total_amount"),
            func.count(Order.order_id).label("orders_count")
        )
        .where(Order.order_date.between(start, end))
        .where(Order.payment_status == "completed")
        .where(*location_filter)
        .group_by(Order.payment_method)
    ).all()
    
    payment_methods = [
        {
            "method": method, 
            "amount": float(amount), 
            "orders": count,
            "percentage": round((float(amount) / float(total_revenue)) * 100 if total_revenue else 0, 1)
        }
        for method, amount, count in revenue_by_method
    ]
    
    # Revenue by item type
    revenue_by_type = session.exec(
        select(
            OrderItem.item_type,
            func.sum(OrderItem.total_price).label("total_amount"),
            func.count(OrderItem.order_item_id).label("items_count")
        )
        .join(Order, OrderItem.order_id == Order.order_id)
        .where(Order.order_date.between(start, end))
        .where(Order.payment_status == "completed")
        .where(*location_filter)
        .group_by(OrderItem.item_type)
    ).all()
    
    item_types = [
        {
            "type": item_type, 
            "amount": float(amount), 
            "count": count,
            "percentage": round((float(amount) / float(total_revenue)) * 100 if total_revenue else 0, 1)
        }
        for item_type, amount, count in revenue_by_type
    ]
    
    # Orders count
    orders_count = session.exec(
        select(func.count(Order.order_id))
        .where(Order.order_date.between(start, end))
        .where(Order.payment_status == "completed")
        .where(*location_filter)
    ).one() or 0
    
    # Average order value
    avg_order_value = float(total_revenue) / orders_count if orders_count > 0 else 0
    
    return {
        "total_revenue": float(total_revenue),
        "orders_count": orders_count,
        "avg_order_value": round(avg_order_value, 2),
        "revenue_by_payment_method": payment_methods,
        "revenue_by_item_type": item_types,
        "date_range": {
            "start_date": start.date().isoformat(),
            "end_date": end.date().isoformat()
        }
    }

@router.get("/users", response_model=dict)
def get_user_metrics(
    session: SessionDep, 
    current_user: GetAdminUser,
    days: int = 30
) -> Any:
    """Get user acquisition and activity metrics"""
    current_date = datetime.utcnow()
    start_date = current_date - timedelta(days=days)
    
    # Get parent role
    parent_role = session.exec(
        select(Role).where(Role.role_name == "parent")
    ).first()
    
    if not parent_role:
        return {
            "total_parents": 0,
            "new_parents": 0,
            "active_parents": 0,
            "total_children": 0
        }
    
    # Total parents
    total_parents = session.exec(
        select(func.count(User.user_id))
        .where(User.role_id == parent_role.role_id)
        .where(User.is_active == True)
    ).one() or 0
    
    # New parents in time period
    new_parents = session.exec(
        select(func.count(User.user_id))
        .where(User.role_id == parent_role.role_id)
        .where(User.created_at >= start_date)
    ).one() or 0
    
    # Active parents (with visits in time period)
    active_parents = session.exec(
        select(func.count(User.user_id.distinct()))
        .join(Child, User.user_id == Child.parent_id)
        .join(Visit, Child.child_id == Visit.child_id)
        .where(User.role_id == parent_role.role_id)
        .where(Visit.check_in_time >= start_date)
    ).one() or 0
    
    # Total children
    total_children = session.exec(
        select(func.count(Child.child_id))
        .where(Child.is_active == True)
    ).one() or 0
    
    # New users by day
    new_users_by_day = []
    for i in range(days):
        day_date = start_date + timedelta(days=i)
        next_day = day_date + timedelta(days=1)
        
        day_count = session.exec(
            select(func.count(User.user_id))
            .where(User.role_id == parent_role.role_id)
            .where(User.created_at >= day_date)
            .where(User.created_at < next_day)
        ).one() or 0
        
        new_users_by_day.append({
            "date": day_date.date().isoformat(),
            "count": day_count
        })
    
    # Age distribution of children
    current_year = datetime.utcnow().year
    age_distribution = session.exec(
        select(
            func.extract('year', func.age(func.current_date(), Child.birth_date)).label("age"),
            func.count(Child.child_id)
        )
        .where(Child.is_active == True)
        .group_by(func.extract('year', func.age(func.current_date(), Child.birth_date)))
        .order_by("age")
    ).all()
    
    age_groups = [
        {"age": int(age), "count": count}
        for age, count in age_distribution
    ]
    
    return {
        "total_parents": total_parents,
        "new_parents": new_parents,
        "active_parents": active_parents,
        "total_children": total_children,
        "child_to_parent_ratio": round(total_children / total_parents, 1) if total_parents > 0 else 0,
        "active_percentage": round((active_parents / total_parents) * 100, 1) if total_parents > 0 else 0,
        "new_users_by_day": new_users_by_day,
        "child_age_distribution": age_groups,
        "date_range": {
            "start_date": start_date.date().isoformat(),
            "end_date": current_date.date().isoformat(),
            "days": days
        }
    }