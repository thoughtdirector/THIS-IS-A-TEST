from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select, func
from typing import Any, Optional, List
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models.zone import Zone
from app.models.location import Location
from app.models.user import User
from app.models.visit import Visit

router = APIRouter()

# Public routes 
@router.get("/", response_model=List[dict])
def get_zones(
    session: SessionDep,
    current_user: Optional[CurrentUser] = None,
    location_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all active zones, optionally filtered by location"""
    query = select(Zone).where(Zone.is_active == True)
    
    if location_id:
        query = query.where(Zone.location_id == location_id)
    
    query = query.offset(skip).limit(limit)
    zones = session.exec(query).all()
    
    result = []
    for zone in zones:
        # Get location info
        location = session.get(Location, zone.location_id)
        
        # Get staff info if assigned
        staff = None
        if zone.staff_id:
            staff_user = session.get(User, zone.staff_id)
            if staff_user:
                staff = {
                    "user_id": staff_user.user_id,
                    "fullname": staff_user.fullname
                }
        
        # Count current visitors in this zone
        current_visitors = session.exec(
            select(func.count(Visit.visit_id))
            .where(Visit.zone_id == zone.zone_id)
            .where(Visit.check_out_time == None)
        ).one()
        
        zone_data = {
            "zone_id": zone.zone_id,
            "name": zone.name,
            "description": zone.description,
            "location": {
                "location_id": location.location_id,
                "name": location.name
            } if location else None,
            "max_capacity": zone.max_capacity,
            "min_age": zone.min_age,
            "max_age": zone.max_age,
            "staff": staff,
            "current_visitors": current_visitors,
            "available_capacity": max(0, zone.max_capacity - current_visitors)
        }
        result.append(zone_data)
    
    return result

@router.get("/{zone_id}", response_model=dict)
def get_zone_details(
    *, session: SessionDep, zone_id: int, current_user: Optional[CurrentUser] = None
) -> Any:
    """Get detailed information about a zone"""
    zone = session.get(Zone, zone_id)
    
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    if not zone.is_active:
        raise HTTPException(status_code=404, detail="Zone not active")
    
    # Get location info
    location = session.get(Location, zone.location_id)
    
    # Get staff info if assigned
    staff = None
    if zone.staff_id:
        staff_user = session.get(User, zone.staff_id)
        if staff_user:
            staff = {
                "user_id": staff_user.user_id,
                "fullname": staff_user.fullname,
                "email": staff_user.email
            }
    
    # Count current visitors in this zone
    current_visitors = session.exec(
        select(func.count(Visit.visit_id))
        .where(Visit.zone_id == zone.zone_id)
        .where(Visit.check_out_time == None)
    ).one()
    
    # Get current visitors details
    active_visits = session.exec(
        select(Visit)
        .where(Visit.zone_id == zone.zone_id)
        .where(Visit.check_out_time == None)
    ).all()
    
    active_visitors = []
    for visit in active_visits:
        from app.models.child import Child
        child = session.get(Child, visit.child_id)
        
        if child:
            active_visitors.append({
                "visit_id": visit.visit_id,
                "child_id": child.child_id,
                "child_name": child.fullname,
                "check_in_time": visit.check_in_time
            })
    
    return {
        "zone_id": zone.zone_id,
        "name": zone.name,
        "description": zone.description,
        "location": {
            "location_id": location.location_id,
            "name": location.name,
            "address": location.address,
            "city": location.city
        } if location else None,
        "max_capacity": zone.max_capacity,
        "min_age": zone.min_age,
        "max_age": zone.max_age,
        "staff": staff,
        "current_visitors": current_visitors,
        "available_capacity": max(0, zone.max_capacity - current_visitors),
        "active_visitors": active_visitors
    }

# Admin routes
@router.post("/", response_model=dict)
def create_zone(
    *, session: SessionDep, current_user: GetAdminUser, zone_data: dict
) -> Any:
    """Create a new zone (admin only)"""
    # Verify location exists
    location_id = zone_data.get("location_id")
    location = session.get(Location, location_id)
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Verify staff exists if provided
    staff_id = zone_data.get("staff_id")
    if staff_id:
        staff = session.get(User, staff_id)
        if not staff:
            raise HTTPException(status_code=404, detail="Staff user not found")
    
    new_zone = Zone(
        location_id=location_id,
        name=zone_data.get("name"),
        description=zone_data.get("description"),
        max_capacity=zone_data.get("max_capacity"),
        min_age=zone_data.get("min_age"),
        max_age=zone_data.get("max_age"),
        staff_id=staff_id
    )
    
    session.add(new_zone)
    session.commit()
    session.refresh(new_zone)
    
    return {
        "zone_id": new_zone.zone_id,
        "message": "Zone created successfully"
    }

@router.put("/{zone_id}", response_model=dict)
def update_zone(
    *, session: SessionDep, current_user: GetAdminUser, zone_id: int, zone_data: dict
) -> Any:
    """Update a zone (admin only)"""
    zone = session.get(Zone, zone_id)
    
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Verify location exists if changing
    if "location_id" in zone_data:
        location_id = zone_data["location_id"]
        location = session.get(Location, location_id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        zone.location_id = location_id
    
    # Verify staff exists if provided
    if "staff_id" in zone_data:
        staff_id = zone_data["staff_id"]
        if staff_id:
            staff = session.get(User, staff_id)
            if not staff:
                raise HTTPException(status_code=404, detail="Staff user not found")
        zone.staff_id = staff_id
    
    # Update other fields
    if "name" in zone_data:
        zone.name = zone_data["name"]
    if "description" in zone_data:
        zone.description = zone_data["description"]
    if "max_capacity" in zone_data:
        zone.max_capacity = zone_data["max_capacity"]
    if "min_age" in zone_data:
        zone.min_age = zone_data["min_age"]
    if "max_age" in zone_data:
        zone.max_age = zone_data["max_age"]
    if "is_active" in zone_data:
        zone.is_active = zone_data["is_active"]
    
    session.add(zone)
    session.commit()
    session.refresh(zone)
    
    return {
        "zone_id": zone.zone_id,
        "message": "Zone updated successfully"
    }

@router.delete("/{zone_id}", response_model=dict)
def deactivate_zone(
    *, session: SessionDep, current_user: GetAdminUser, zone_id: int
) -> Any:
    """Deactivate a zone (admin only)"""
    zone = session.get(Zone, zone_id)
    
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Check if there are active visits in this zone
    active_visits = session.exec(
        select(Visit)
        .where(Visit.zone_id == zone_id)
        .where(Visit.check_out_time == None)
    ).first()
    
    if active_visits:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate zone with active visits"
        )
    
    # Soft delete by setting is_active to False
    zone.is_active = False
    session.add(zone)
    session.commit()
    
    return {"message": "Zone deactivated successfully"}

@router.get("/{zone_id}/stats", response_model=dict)
def get_zone_stats(
    *, session: SessionDep, current_user: GetAdminUser, zone_id: int
) -> Any:
    """Get statistics for a zone (admin only)"""
    zone = session.get(Zone, zone_id)
    
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Current usage percentage
    current_visitors = session.exec(
        select(func.count(Visit.visit_id))
        .where(Visit.zone_id == zone_id)
        .where(Visit.check_out_time == None)
    ).one()
    
    usage_percentage = (current_visitors / zone.max_capacity * 100) if zone.max_capacity > 0 else 0
    
    # Total visits today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_visits = session.exec(
        select(func.count(Visit.visit_id))
        .where(Visit.zone_id == zone_id)
        .where(Visit.check_in_time >= today_start)
    ).one()
    
    # Average visit duration (completed visits)
    avg_duration = session.exec(
        select(func.avg(Visit.minutes_used))
        .where(Visit.zone_id == zone_id)
        .where(Visit.check_out_time != None)
    ).one() or 0
    
    return {
        "zone_id": zone.zone_id,
        "name": zone.name,
        "current_visitors": current_visitors,
        "max_capacity": zone.max_capacity,
        "usage_percentage": round(usage_percentage, 1),
        "available_capacity": max(0, zone.max_capacity - current_visitors),
        "today_visits": today_visits,
        "avg_visit_duration_minutes": round(avg_duration, 1)
    }