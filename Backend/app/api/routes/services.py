from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select, func
from typing import Any, Optional, List
from datetime import datetime, timedelta
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models.service import Service
from app.models.session import Session as ServiceSession
from app.models.location import Location
from app.models.zone import Zone
from app.models.bundle import Bundle
from app.models.bundle_service import BundleService

router = APIRouter()

# Parent-facing service listing
@router.get("/available", response_model=List[dict])
def get_available_services(
    session: SessionDep,
    current_user: CurrentUser,
    location_id: Optional[int] = None,
    service_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get available services for parents"""
    query = select(Service).where(Service.is_active == True)
    
    if location_id:
        query = query.where(Service.location_id == location_id)
    
    if service_type:
        query = query.where(Service.service_type == service_type)
    
    query = query.offset(skip).limit(limit)
    services = session.exec(query).all()
    
    result = []
    for service in services:
        location = session.get(Location, service.location_id)
        
        service_data = {
            "service_id": service.service_id,
            "name": service.name,
            "service_type": service.service_type,
            "description": service.description,
            "duration_minutes": service.duration_minutes,
            "price": service.price,
            "location_name": location.name if location else "Unknown",
            "min_age": service.min_age,
            "max_age": service.max_age
        }
        result.append(service_data)
    
    return result

# Service details with upcoming sessions
@router.get("/{service_id}", response_model=dict)
def get_service_details(
    *, session: SessionDep, current_user: CurrentUser, service_id: int
) -> Any:
    """Get detailed information about a service with upcoming sessions"""
    service = session.get(Service, service_id)
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    location = session.get(Location, service.location_id)
    zone = session.get(Zone, service.zone_id) if service.zone_id else None
    
    # Get upcoming sessions for this service
    now = datetime.utcnow()
    upcoming_sessions = session.exec(
        select(ServiceSession)
        .where(ServiceSession.service_id == service_id)
        .where(ServiceSession.start_time > now)
        .where(ServiceSession.is_canceled == False)
        .order_by(ServiceSession.start_time)
        .limit(10)
    ).all()
    
    session_data = []
    for s in upcoming_sessions:
        # Calculate available capacity
        available_capacity = s.max_capacity - s.current_capacity
        
        session_data.append({
            "session_id": s.session_id,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "available_capacity": available_capacity,
            "max_capacity": s.max_capacity,
            "is_full": available_capacity <= 0
        })
    
    # Get bundles that include this service
    bundles_with_service = session.exec(
        select(Bundle)
        .join(BundleService)
        .where(BundleService.service_id == service_id)
        .where(Bundle.is_active == True)
    ).all()
    
    bundle_data = []
    for bundle in bundles_with_service:
        # Get quantity of this service in the bundle
        bundle_service = session.exec(
            select(BundleService)
            .where(BundleService.bundle_id == bundle.bundle_id)
            .where(BundleService.service_id == service_id)
        ).first()
        
        bundle_data.append({
            "bundle_id": bundle.bundle_id,
            "name": bundle.name,
            "description": bundle.description,
            "price": bundle.price,
            "quantity_included": bundle_service.quantity if bundle_service else 1,
            "is_subscription": bundle.is_subscription,
            "duration_days": bundle.duration_days
        })
    
    return {
        "service_id": service.service_id,
        "name": service.name,
        "service_type": service.service_type,
        "description": service.description,
        "duration_minutes": service.duration_minutes,
        "price": service.price,
        "location": {
            "location_id": location.location_id,
            "name": location.name,
            "address": location.address,
            "city": location.city
        } if location else None,
        "zone": {
            "zone_id": zone.zone_id,
            "name": zone.name
        } if zone else None,
        "min_age": service.min_age,
        "max_age": service.max_age,
        "upcoming_sessions": session_data,
        "available_in_bundles": bundle_data
    }

# Admin routes for service management
@router.post("/", response_model=dict)
def create_service(
    *, session: SessionDep, current_user: GetAdminUser, service_data: dict
) -> Any:
    """Create a new service (admin only)"""
    # Verify location exists
    location_id = service_data.get("location_id")
    location = session.get(Location, location_id)
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Verify zone exists if provided
    zone_id = service_data.get("zone_id")
    if zone_id:
        zone = session.get(Zone, zone_id)
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
    
    # Create service
    new_service = Service(
        location_id=location_id,
        zone_id=zone_id,
        service_type=service_data.get("service_type", "play_time"),
        name=service_data.get("name"),
        description=service_data.get("description"),
        duration_minutes=service_data.get("duration_minutes"),
        max_capacity=service_data.get("max_capacity"),
        min_age=service_data.get("min_age"),
        max_age=service_data.get("max_age"),
        price=service_data.get("price"),
        created_by=current_user.user_id
    )
    
    session.add(new_service)
    session.commit()
    session.refresh(new_service)
    
    return {
        "service_id": new_service.service_id,
        "message": "Service created successfully"
    }

@router.put("/{service_id}", response_model=dict)
def update_service(
    *, session: SessionDep, current_user: GetAdminUser, service_id: int, service_data: dict
) -> Any:
    """Update an existing service (admin only)"""
    service = session.get(Service, service_id)
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Update fields
    if "name" in service_data:
        service.name = service_data["name"]
    if "description" in service_data:
        service.description = service_data["description"]
    if "service_type" in service_data:
        service.service_type = service_data["service_type"]
    if "duration_minutes" in service_data:
        service.duration_minutes = service_data["duration_minutes"]
    if "max_capacity" in service_data:
        service.max_capacity = service_data["max_capacity"]
    if "min_age" in service_data:
        service.min_age = service_data["min_age"]
    if "max_age" in service_data:
        service.max_age = service_data["max_age"]
    if "price" in service_data:
        service.price = service_data["price"]
    if "zone_id" in service_data:
        # Verify zone exists
        zone_id = service_data["zone_id"]
        if zone_id:
            zone = session.get(Zone, zone_id)
            if not zone:
                raise HTTPException(status_code=404, detail="Zone not found")
        service.zone_id = zone_id
    if "is_active" in service_data:
        service.is_active = service_data["is_active"]
    
    session.add(service)
    session.commit()
    session.refresh(service)
    
    return {
        "service_id": service.service_id,
        "message": "Service updated successfully"
    }

@router.delete("/{service_id}", response_model=dict)
def deactivate_service(
    *, session: SessionDep, current_user: GetAdminUser, service_id: int
) -> Any:
    """Deactivate a service (admin only)"""
    service = session.get(Service, service_id)
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Soft delete by setting is_active to False
    service.is_active = False
    session.add(service)
    session.commit()
    
    return {"message": "Service deactivated successfully"}

# Session management routes 
@router.post("/sessions", response_model=dict)
def create_service_session(
    *, session: SessionDep, current_user: GetAdminUser, session_data: dict
) -> Any:
    """Create a new service session (admin only)"""
    # Verify service exists
    service_id = session_data.get("service_id")
    service = session.get(Service, service_id)
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Verify staff if provided
    staff_id = session_data.get("staff_id")
    if staff_id:
        staff = session.get(User, staff_id)
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")
    
    # Parse start and end times
    start_time = session_data.get("start_time")
    if not start_time:
        raise HTTPException(status_code=400, detail="Start time is required")
    
    # If end_time not provided, calculate it from service duration
    end_time = session_data.get("end_time")
    if not end_time and service.duration_minutes:
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        end_time = start_time + timedelta(minutes=service.duration_minutes)
    
    # Create session
    new_session = ServiceSession(
        service_id=service_id,
        staff_id=staff_id,
        start_time=start_time,
        end_time=end_time,
        max_capacity=session_data.get("max_capacity", service.max_capacity),
        current_capacity=0
    )
    
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    
    return {
        "session_id": new_session.session_id,
        "message": "Service session created successfully"
    }

@router.put("/sessions/{session_id}", response_model=dict)
def update_service_session(
    *, session: SessionDep, current_user: GetAdminUser, session_id: int, session_data: dict
) -> Any:
    """Update a service session (admin only)"""
    service_session = session.get(ServiceSession, session_id)
    
    if not service_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update fields
    if "staff_id" in session_data:
        staff_id = session_data["staff_id"]
        if staff_id:
            staff = session.get(User, staff_id)
            if not staff:
                raise HTTPException(status_code=404, detail="Staff not found")
        service_session.staff_id = staff_id
    
    if "start_time" in session_data:
        service_session.start_time = session_data["start_time"]
    
    if "end_time" in session_data:
        service_session.end_time = session_data["end_time"]
    
    if "max_capacity" in session_data:
        service_session.max_capacity = session_data["max_capacity"]
    
    if "is_canceled" in session_data:
        service_session.is_canceled = session_data["is_canceled"]
    
    session.add(service_session)
    session.commit()
    session.refresh(service_session)
    
    return {
        "session_id": service_session.session_id,
        "message": "Service session updated successfully"
    }

@router.delete("/sessions/{session_id}", response_model=dict)
def cancel_service_session(
    *, session: SessionDep, current_user: GetAdminUser, session_id: int
) -> Any:
    """Cancel a service session (admin only)"""
    service_session = session.get(ServiceSession, session_id)
    
    if not service_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Mark as canceled
    service_session.is_canceled = True
    session.add(service_session)
    session.commit()
    
    # Here you might want to handle notifying users who have booked this session
    
    return {"message": "Service session canceled successfully"}

@router.get("/sessions/upcoming", response_model=List[dict])
def get_upcoming_sessions(
    session: SessionDep,
    current_user: CurrentUser,
    location_id: Optional[int] = None,
    service_type: Optional[str] = None,
    days_ahead: int = 7,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get upcoming service sessions for booking"""
    now = datetime.utcnow()
    end_date = now + timedelta(days=days_ahead)
    
    # Build query for sessions
    query = (
        select(ServiceSession, Service)
        .join(Service)
        .where(ServiceSession.start_time.between(now, end_date))
        .where(ServiceSession.is_canceled == False)
    )
    
    if location_id:
        query = query.where(Service.location_id == location_id)
    
    if service_type:
        query = query.where(Service.service_type == service_type)
    
    query = query.order_by(ServiceSession.start_time).offset(skip).limit(limit)
    results = session.exec(query).all()
    
    session_list = []
    for service_session, service in results:
        # Calculate available capacity
        available_capacity = service_session.max_capacity - service_session.current_capacity
        
        session_list.append({
            "session_id": service_session.session_id,
            "service_id": service.service_id,
            "service_name": service.name,
            "service_type": service.service_type,
            "start_time": service_session.start_time,
            "end_time": service_session.end_time,
            "duration_minutes": service.duration_minutes,
            "available_capacity": available_capacity,
            "max_capacity": service_session.max_capacity,
            "price": service.price,
            "location_id": service.location_id,
            "is_full": available_capacity <= 0
        })
    
    return session_list

@router.get("/bundles", response_model=List[dict])
def get_service_bundles(
    session: SessionDep,
    current_user: CurrentUser,
    location_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get available service bundles/packages"""
    query = select(Bundle).where(Bundle.is_active == True)
    
    if location_id:
        query = query.where(Bundle.location_id == location_id)
    
    query = query.offset(skip).limit(limit)
    bundles = session.exec(query).all()
    
    bundle_list = []
    for bundle in bundles:
        # Get services included in this bundle
        bundle_services = session.exec(
            select(BundleService, Service)
            .join(Service)
            .where(BundleService.bundle_id == bundle.bundle_id)
        ).all()
        
        services_included = []
        for bs, service in bundle_services:
            services_included.append({
                "service_id": service.service_id,
                "name": service.name,
                "service_type": service.service_type,
                "quantity": bs.quantity,
                "individual_price": service.price,
                "total_value": service.price * bs.quantity
            })
        
        # Calculate total value of included services
        total_value = sum(s["total_value"] for s in services_included)
        savings = total_value - bundle.price if total_value > bundle.price else 0
        
        bundle_list.append({
            "bundle_id": bundle.bundle_id,
            "name": bundle.name,
            "description": bundle.description,
            "price": bundle.price,
            "total_value": total_value,
            "savings": savings,
            "savings_percentage": round((savings / total_value) * 100) if total_value > 0 else 0,
            "is_subscription": bundle.is_subscription,
            "duration_days": bundle.duration_days,
            "services_included": services_included
        })
    
    return bundle_list

@router.get("/bundles/{bundle_id}", response_model=dict)
def get_bundle_details(
    *, session: SessionDep, current_user: CurrentUser, bundle_id: int
) -> Any:
    """Get detailed information about a service bundle"""
    bundle = session.get(Bundle, bundle_id)
    
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    # Get location information
    location = session.get(Location, bundle.location_id)
    
    # Get services included in this bundle
    bundle_services = session.exec(
        select(BundleService, Service)
        .join(Service)
        .where(BundleService.bundle_id == bundle.bundle_id)
    ).all()
    
    services_included = []
    for bs, service in bundle_services:
        services_included.append({
            "service_id": service.service_id,
            "name": service.name,
            "service_type": service.service_type,
            "quantity": bs.quantity,
            "individual_price": service.price,
            "total_value": service.price * bs.quantity
        })
    
    # Calculate total value and savings
    total_value = sum(s["total_value"] for s in services_included)
    savings = total_value - bundle.price if total_value > bundle.price else 0
    
    return {
        "bundle_id": bundle.bundle_id,
        "name": bundle.name,
        "description": bundle.description,
        "price": bundle.price,
        "total_value": total_value,
        "savings": savings,
        "savings_percentage": round((savings / total_value) * 100) if total_value > 0 else 0,
        "is_subscription": bundle.is_subscription,
        "duration_days": bundle.duration_days,
        "location": {
            "location_id": location.location_id,
            "name": location.name,
            "address": location.address,
            "city": location.city
        } if location else None,
        "services_included": services_included
    }