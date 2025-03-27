from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select
from typing import Any, Optional, List
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models.location import Location
from app.models.zone import Zone
from app.models.service import Service
from app.models.visit import Visit

router = APIRouter()

# Public routes
@router.get("/", response_model=List[dict])
def get_locations(
    session: SessionDep,
    current_user: Optional[CurrentUser] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all active locations"""
    locations = session.exec(
        select(Location)
        .where(Location.is_active == True)
        .offset(skip)
        .limit(limit)
    ).all()
    
    result = []
    for location in locations:
        # Count zones in this location
        zones_count = session.exec(
            select(func.count(Zone.zone_id))
            .where(Zone.location_id == location.location_id)
            .where(Zone.is_active == True)
        ).one()
        
        # Count services in this location
        services_count = session.exec(
            select(func.count(Service.service_id))
            .where(Service.location_id == location.location_id)
            .where(Service.is_active == True)
        ).one()
        
        location_data = {
            "location_id": location.location_id,
            "name": location.name,
            "address": location.address,
            "city": location.city,
            "state": location.state,
            "postal_code": location.postal_code,
            "country": location.country,
            "phone": location.phone,
            "email": location.email,
            "zones_count": zones_count,
            "services_count": services_count
        }
        result.append(location_data)
    
    return result

@router.get("/{location_id}", response_model=dict)
def get_location_details(
    *, session: SessionDep, location_id: int, current_user: Optional[CurrentUser] = None
) -> Any:
    """Get detailed information about a location"""
    location = session.get(Location, location_id)
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    if not location.is_active:
        raise HTTPException(status_code=404, detail="Location not active")
    
    # Get zones in this location
    zones = session.exec(
        select(Zone)
        .where(Zone.location_id == location_id)
        .where(Zone.is_active == True)
    ).all()
    
    zones_data = []
    for zone in zones:
        zones_data.append({
            "zone_id": zone.zone_id,
            "name": zone.name,
            "description": zone.description,
            "max_capacity": zone.max_capacity,
            "min_age": zone.min_age,
            "max_age": zone.max_age
        })
    
    # Get services in this location
    services = session.exec(
        select(Service)
        .where(Service.location_id == location_id)
        .where(Service.is_active == True)
    ).all()
    
    services_data = []
    for service in services:
        services_data.append({
            "service_id": service.service_id,
            "name": service.name,
            "service_type": service.service_type,
            "description": service.description,
            "duration_minutes": service.duration_minutes,
            "price": service.price
        })
    
    return {
        "location_id": location.location_id,
        "name": location.name,
        "address": location.address,
        "city": location.city,
        "state": location.state,
        "postal_code": location.postal_code,
        "country": location.country,
        "phone": location.phone,
        "email": location.email,
        "zones": zones_data,
        "services": services_data
    }

# Admin routes
@router.post("/", response_model=dict)
def create_location(
    *, session: SessionDep, current_user: GetAdminUser, location_data: dict
) -> Any:
    """Create a new location (admin only)"""
    new_location = Location(
        name=location_data.get("name"),
        address=location_data.get("address"),
        city=location_data.get("city"),
        state=location_data.get("state"),
        postal_code=location_data.get("postal_code"),
        country=location_data.get("country"),
        phone=location_data.get("phone"),
        email=location_data.get("email")
    )
    
    session.add(new_location)
    session.commit()
    session.refresh(new_location)
    
    return {
        "location_id": new_location.location_id,
        "message": "Location created successfully"
    }

@router.put("/{location_id}", response_model=dict)
def update_location(
    *, session: SessionDep, current_user: GetAdminUser, location_id: int, location_data: dict
) -> Any:
    """Update a location (admin only)"""
    location = session.get(Location, location_id)
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Update fields
    if "name" in location_data:
        location.name = location_data["name"]
    if "address" in location_data:
        location.address = location_data["address"]
    if "city" in location_data:
        location.city = location_data["city"]
    if "state" in location_data:
        location.state = location_data["state"]
    if "postal_code" in location_data:
        location.postal_code = location_data["postal_code"]
    if "country" in location_data:
        location.country = location_data["country"]
    if "phone" in location_data:
        location.phone = location_data["phone"]
    if "email" in location_data:
        location.email = location_data["email"]
    if "is_active" in location_data:
        location.is_active = location_data["is_active"]
    
    session.add(location)
    session.commit()
    session.refresh(location)
    
    return {
        "location_id": location.location_id,
        "message": "Location updated successfully"
    }

@router.delete("/{location_id}", response_model=dict)
def deactivate_location(
    *, session: SessionDep, current_user: GetAdminUser, location_id: int
) -> Any:
    """Deactivate a location (admin only)"""
    location = session.get(Location, location_id)
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Check if there are active visits at this location
    active_visits = session.exec(
        select(Visit)
        .where(Visit.location_id == location_id)
        .where(Visit.check_out_time == None)
    ).first()
    
    if active_visits:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate location with active visits"
        )
    
    # Soft delete by setting is_active to False
    location.is_active = False
    session.add(location)
    session.commit()
    
    return {"message": "Location deactivated successfully"}

@router.get("/{location_id}/stats", response_model=dict)
def get_location_stats(
    *, session: SessionDep, current_user: GetAdminUser, location_id: int
) -> Any:
    """Get statistics for a location (admin only)"""
    location = session.get(Location, location_id)
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Current active visits
    active_visits = session.exec(
        select(func.count(Visit.visit_id))
        .where(Visit.location_id == location_id)
        .where(Visit.check_out_time == None)
    ).one()
    
    # Total services
    total_services = session.exec(
        select(func.count(Service.service_id))
        .where(Service.location_id == location_id)
    ).one()
    
    # Total zones
    total_zones = session.exec(
        select(func.count(Zone.zone_id))
        .where(Zone.location_id == location_id)
    ).one()
    
    # Total capacity across all zones
    total_capacity = session.exec(
        select(func.sum(Zone.max_capacity))
        .where(Zone.location_id == location_id)
        .where(Zone.is_active == True)
    ).one() or 0
    
    # Visits by type
    visit_types = session.exec(
        select(Visit.visit_type, func.count(Visit.visit_id))
        .where(Visit.location_id == location_id)
        .group_by(Visit.visit_type)
    ).all()
    
    visits_by_type = {visit_type: count for visit_type, count in visit_types}
    
    return {
        "location_id": location.location_id,
        "name": location.name,
        "active_visits": active_visits,
        "total_services": total_services,
        "total_zones": total_zones,
        "total_capacity": total_capacity,
        "visits_by_type": visits_by_type
    }