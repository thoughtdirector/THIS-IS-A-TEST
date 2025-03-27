from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select, func
from typing import Any, Optional, List
from datetime import datetime
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models.visit import Visit
from app.models.child import Child
from app.models.credit import Credit
from app.models.role import Role
from app.models.user import User
from app.utils.qr_code import generate_qr_code

router = APIRouter()

# QR Code generation for check-in/out
@router.get("/generate-qr/{child_id}", response_model=dict)
def generate_child_qr(
    *, session: SessionDep, current_user: CurrentUser, child_id: int
) -> Any:
    """Generate a QR code for child check-in/out"""
    # Verify child belongs to parent
    child = session.exec(
        select(Child)
        .where(Child.child_id == child_id)
        .where(Child.parent_id == current_user.user_id)
    ).first()
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found or not authorized")
    
    # Generate QR code data
    qr_data = f"CHILD:{child_id}:{datetime.utcnow().isoformat()}"
    qr_code = generate_qr_code(qr_data)
    
    return {
        "child_id": child_id,
        "child_name": child.fullname,
        "qr_code": qr_code
    }

# Admin check-in process
@router.post("/check-in", response_model=dict)
def check_in_child(
    *, session: SessionDep, current_user: GetAdminUser, check_in_data: dict
) -> Any:
    """Check in a child using QR code or manual entry"""
    # Verify admin privileges
    admin_roles = session.exec(
        select(Role).where(Role.role_name.in_(["superadmin", "owner", "employee"]))
    ).all()
    admin_role_ids = [role.role_id for role in admin_roles]
    
    if current_user.role_id not in admin_role_ids:
        raise HTTPException(status_code=403, detail="Not authorized for check-in")
    
    # Get child
    child_id = check_in_data.get("child_id")
    if not child_id:
        raise HTTPException(status_code=400, detail="Child ID is required")
    
    child = session.get(Child, child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Check if child already has an active visit
    active_visit = session.exec(
        select(Visit)
        .where(Visit.child_id == child_id)
        .where(Visit.check_out_time == None)
    ).first()
    
    if active_visit:
        raise HTTPException(status_code=400, detail="Child already has an active visit")
    
    # Create new visit record
    location_id = check_in_data.get("location_id")
    if not location_id:
        raise HTTPException(status_code=400, detail="Location ID is required")
    
    # Determine visit type and related IDs
    visit_type = check_in_data.get("visit_type", "play_time")
    zone_id = check_in_data.get("zone_id")
    session_id = check_in_data.get("session_id")
    credit_id = check_in_data.get("credit_id")
    
    # For play_time, check if there's an available credit
    if visit_type == "play_time" and not credit_id:
        # Find valid credit for this child's parent
        valid_credit = session.exec(
            select(Credit)
            .where(Credit.parent_id == child.parent_id)
            .where(Credit.location_id == location_id)
            .where(Credit.minutes_remaining > 0)
            .where((Credit.expiry_date == None) | (Credit.expiry_date >= datetime.utcnow().date()))
        ).first()
        
        if valid_credit:
            credit_id = valid_credit.credit_id
        else:
            # No valid credit found
            raise HTTPException(status_code=400, detail="No valid play time credit available")
    
    # Create visit
    new_visit = Visit(
        child_id=child_id,
        location_id=location_id,
        zone_id=zone_id,
        session_id=session_id,
        credit_id=credit_id,
        visit_type=visit_type,
        status="checked_in",
        check_in_time=datetime.utcnow(),
        check_in_by=current_user.user_id
    )
    
    session.add(new_visit)
    session.commit()
    session.refresh(new_visit)
    
    return {
        "visit_id": new_visit.visit_id,
        "check_in_time": new_visit.check_in_time,
        "message": f"Child checked in successfully for {visit_type}"
    }

# Admin check-out process
@router.post("/check-out/{visit_id}", response_model=dict)
def check_out_child(
    *, session: SessionDep, current_user: GetAdminUser, visit_id: int
) -> Any:
    """Check out a child and calculate time used"""
    # Verify admin privileges
    admin_roles = session.exec(
        select(Role).where(Role.role_name.in_(["superadmin", "owner", "employee"]))
    ).all()
    admin_role_ids = [role.role_id for role in admin_roles]
    
    if current_user.role_id not in admin_role_ids:
        raise HTTPException(status_code=403, detail="Not authorized for check-out")
    
    # Get visit
    visit = session.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # Check if already checked out
    if visit.check_out_time:
        raise HTTPException(status_code=400, detail="Child already checked out")
    
    # Record check-out time
    check_out_time = datetime.utcnow()
    visit.check_out_time = check_out_time
    visit.check_out_by = current_user.user_id
    visit.status = "completed"
    
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
        "message": "Child checked out successfully"
    }

# Get parent's children's visits
@router.get("/my-children-visits", response_model=List[dict])
def get_my_children_visits(
    session: SessionDep, 
    current_user: CurrentUser,
    skip: int = 0, 
    limit: int = 100,
    active_only: bool = False
) -> Any:
    """Get visits for all children of the current parent"""
    # Get all current user's children
    children = session.exec(
        select(Child)
        .where(Child.parent_id == current_user.user_id)
        .where(Child.is_active == True)
    ).all()
    
    child_ids = [child.child_id for child in children]
    
    if not child_ids:
        return []
    
    # Get visits for these children
    query = select(Visit).where(Visit.child_id.in_(child_ids))
    
    if active_only:
        query = query.where(Visit.check_out_time == None)
    
    query = query.order_by(Visit.check_in_time.desc()).offset(skip).limit(limit)
    visits = session.exec(query).all()
    
    result = []
    for visit in visits:
        child = next((c for c in children if c.child_id == visit.child_id), None)
        
        visit_data = {
            "visit_id": visit.visit_id,
            "child_id": visit.child_id,
            "child_name": child.fullname if child else "Unknown",
            "visit_type": visit.visit_type,
            "check_in_time": visit.check_in_time,
            "check_out_time": visit.check_out_time,
            "status": visit.status,
            "minutes_used": visit.minutes_used
        }
        result.append(visit_data)
    
    return result

# Admin route to view all active visits
@router.get("/active-visits", response_model=List[dict])
def get_active_visits(
    session: SessionDep, 
    current_user: GetAdminUser,
    location_id: Optional[int] = None,
    skip: int = 0, 
    limit: int = 100
) -> Any:
    """Get all active visits (admin only)"""
    query = select(Visit).where(Visit.check_out_time == None)
    
    if location_id:
        query = query.where(Visit.location_id == location_id)
    
    query = query.order_by(Visit.check_in_time).offset(skip).limit(limit)
    active_visits = session.exec(query).all()
    
    result = []
    for visit in active_visits:
        # Get child info
        child = session.get(Child, visit.child_id)
        
        # Calculate current duration
        current_duration = None
        if visit.check_in_time:
            delta = datetime.utcnow() - visit.check_in_time
            current_duration = int(delta.total_seconds() / 60)
        
        visit_data = {
            "visit_id": visit.visit_id,
            "child_id": visit.child_id,
            "child_name": child.fullname if child else "Unknown",
            "visit_type": visit.visit_type,
            "check_in_time": visit.check_in_time,
            "current_duration_minutes": current_duration,
            "location_id": visit.location_id,
            "zone_id": visit.zone_id,
            "status": visit.status
        }
        result.append(visit_data)
    
    return result

# Admin route to get visit statistics
@router.get("/visit-stats", response_model=dict)
def get_visit_statistics(
    session: SessionDep,
    current_user: GetAdminUser,
    location_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Any:
    """Get visit statistics for a location"""
    # Set default date range if not provided
    if not start_date:
        start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = datetime.now()
    
    # Base query for the specified time range
    query = select(Visit).where(Visit.check_in_time.between(start_date, end_date))
    
    if location_id:
        query = query.where(Visit.location_id == location_id)
    
    # Total visits
    total_visits = session.exec(
        select(func.count(Visit.visit_id)).where(Visit.check_in_time.between(start_date, end_date))
    ).one()
    
    # Active visits
    active_visits = session.exec(
        select(func.count(Visit.visit_id))
        .where(Visit.check_in_time.between(start_date, end_date))
        .where(Visit.check_out_time == None)
    ).one()
    
    # Visits by type
    visit_types = session.exec(
        select(Visit.visit_type, func.count(Visit.visit_id))
        .where(Visit.check_in_time.between(start_date, end_date))
        .group_by(Visit.visit_type)
    ).all()
    
    # Average duration (for completed visits)
    avg_duration = session.exec(
        select(func.avg(Visit.minutes_used))
        .where(Visit.check_in_time.between(start_date, end_date))
        .where(Visit.check_out_time != None)
    ).one()
    
    return {
        "total_visits": total_visits,
        "active_visits": active_visits,
        "visits_by_type": {visit_type: count for visit_type, count in visit_types},
        "average_duration_minutes": round(avg_duration) if avg_duration else 0,
        "date_range": {
            "start_date": start_date,
            "end_date": end_date
        }
    }