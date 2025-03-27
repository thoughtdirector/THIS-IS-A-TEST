from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select
from typing import Any, Optional, List
from datetime import datetime, date, timedelta
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models.credit import Credit
from app.models.user import User
from app.models.location import Location
from app.models.child import Child
from app.models.visit import Visit

router = APIRouter()

@router.get("/my-credits", response_model=List[dict])
def get_my_credits(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get play time credits for the current user"""
    credits = session.exec(
        select(Credit)
        .where(Credit.parent_id == current_user.user_id)
        .offset(skip)
        .limit(limit)
    ).all()
    
    result = []
    for credit in credits:
        # Get location info
        location = session.get(Location, credit.location_id)
        
        # Check if credit is expired
        is_expired = False
        if credit.expiry_date and credit.expiry_date < datetime.utcnow().date():
            is_expired = True
        
        # Get credit usage history
        visits = session.exec(
            select(Visit)
            .where(Visit.credit_id == credit.credit_id)
            .order_by(Visit.check_in_time.desc())
            .limit(5)  # Last 5 visits
        ).all()
        
        usage_history = []
        for visit in visits:
            child = session.get(Child, visit.child_id)
            
            usage_history.append({
                "visit_id": visit.visit_id,
                "child_name": child.fullname if child else "Unknown",
                "check_in_time": visit.check_in_time,
                "check_out_time": visit.check_out_time,
                "minutes_used": visit.minutes_used
            })
        
        credit_data = {
            "credit_id": credit.credit_id,
            "minutes_remaining": credit.minutes_remaining,
            "hours_remaining": round(credit.minutes_remaining / 60, 2),
            "expiry_date": credit.expiry_date,
            "is_expired": is_expired,
            "location": {
                "location_id": location.location_id,
                "name": location.name
            } if location else None,
            "recent_usage": usage_history
        }
        result.append(credit_data)
    
    return result

@router.get("/credit/{credit_id}", response_model=dict)
def get_credit_details(
    *, session: SessionDep, current_user: CurrentUser, credit_id: int
) -> Any:
    """Get detailed information about a credit"""
    credit = session.get(Credit, credit_id)
    
    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")
    
    # Check if user owns this credit or is admin
    admin_user = hasattr(current_user, "is_superuser") and current_user.is_superuser
    
    if credit.parent_id != current_user.user_id and not admin_user:
        raise HTTPException(status_code=403, detail="Not authorized to view this credit")
    
    # Get location info
    location = session.get(Location, credit.location_id)
    
    # Check if credit is expired
    is_expired = False
    if credit.expiry_date and credit.expiry_date < datetime.utcnow().date():
        is_expired = True
    
    # Get all credit usage history
    visits = session.exec(
        select(Visit)
        .where(Visit.credit_id == credit.credit_id)
        .order_by(Visit.check_in_time.desc())
    ).all()
    
    usage_history = []
    for visit in visits:
        child = session.get(Child, visit.child_id)
        
        usage_history.append({
            "visit_id": visit.visit_id,
            "child_name": child.fullname if child else "Unknown",
            "check_in_time": visit.check_in_time,
            "check_out_time": visit.check_out_time,
            "minutes_used": visit.minutes_used
        })
    
    # Calculate total minutes used
    total_minutes_used = sum(visit.minutes_used or 0 for visit in visits if visit.minutes_used)
    
    return {
        "credit_id": credit.credit_id,
        "minutes_remaining": credit.minutes_remaining,
        "hours_remaining": round(credit.minutes_remaining / 60, 2),
        "expiry_date": credit.expiry_date,
        "is_expired": is_expired,
        "location": {
            "location_id": location.location_id,
            "name": location.name,
            "address": location.address,
            "city": location.city
        } if location else None,
        "total_minutes_used": total_minutes_used,
        "total_hours_used": round(total_minutes_used / 60, 2),
        "usage_history": usage_history
    }

# Admin routes for credit management
@router.post("/admin/credits", response_model=dict)
def create_credit(
    *, session: SessionDep, current_user: GetAdminUser, credit_data: dict
) -> Any:
    """Create a new credit manually (admin only)"""
    # Verify user exists
    parent_id = credit_data.get("parent_id")
    user = session.get(User, parent_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify location exists
    location_id = credit_data.get("location_id")
    location = session.get(Location, location_id)
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Check for existing credit
    existing_credit = session.exec(
        select(Credit)
        .where(Credit.parent_id == parent_id)
        .where(Credit.location_id == location_id)
    ).first()
    
    if existing_credit:
        # Add minutes to existing credit
        existing_credit.minutes_remaining += credit_data.get("minutes_remaining", 0)
        
        # Update expiry date if provided and later than current
        new_expiry = credit_data.get("expiry_date")
        if new_expiry and (not existing_credit.expiry_date or new_expiry > existing_credit.expiry_date):
            existing_credit.expiry_date = new_expiry
        
        session.add(existing_credit)
        session.commit()
        session.refresh(existing_credit)
        
        return {
            "credit_id": existing_credit.credit_id,
            "minutes_remaining": existing_credit.minutes_remaining,
            "message": "Credit updated successfully"
        }
    else:
        # Create new credit
        new_credit = Credit(
            parent_id=parent_id,
            location_id=location_id,
            minutes_remaining=credit_data.get("minutes_remaining", 0),
            expiry_date=credit_data.get("expiry_date")
        )
        
        session.add(new_credit)
        session.commit()
        session.refresh(new_credit)
        
        return {
            "credit_id": new_credit.credit_id,
            "minutes_remaining": new_credit.minutes_remaining,
            "message": "Credit created successfully"
        }

@router.put("/admin/credits/{credit_id}", response_model=dict)
def update_credit(
    *, session: SessionDep, current_user: GetAdminUser, credit_id: int, credit_data: dict
) -> Any:
    """Update a credit (admin only)"""
    credit = session.get(Credit, credit_id)
    
    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")
    
    # Update fields
    if "minutes_remaining" in credit_data:
        credit.minutes_remaining = credit_data["minutes_remaining"]
    
    if "expiry_date" in credit_data:
        credit.expiry_date = credit_data["expiry_date"]
    
    # Apply adjustment if provided
    adjustment = credit_data.get("adjustment", 0)
    if adjustment != 0:
        credit.minutes_remaining = max(0, credit.minutes_remaining + adjustment)
    
    session.add(credit)
    session.commit()
    session.refresh(credit)
    
    return {
        "credit_id": credit.credit_id,
        "minutes_remaining": credit.minutes_remaining,
        "expiry_date": credit.expiry_date,
        "message": "Credit updated successfully"
    }

@router.get("/admin/expired-credits", response_model=List[dict])
def get_expired_credits(
    session: SessionDep,
    current_user: GetAdminUser,
    location_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all expired credits (admin only)"""
    today = datetime.utcnow().date()
    
    query = (
        select(Credit)
        .where(Credit.expiry_date < today)
        .where(Credit.minutes_remaining > 0)
    )
    
    if location_id:
        query = query.where(Credit.location_id == location_id)
    
    query = query.offset(skip).limit(limit)
    credits = session.exec(query).all()
    
    result = []
    for credit in credits:
        # Get user info
        user = session.get(User, credit.parent_id)
        
        # Get location info
        location = session.get(Location, credit.location_id)
        
        credit_data = {
            "credit_id": credit.credit_id,
            "user": {
                "user_id": user.user_id,
                "fullname": user.fullname,
                "email": user.email
            } if user else None,
            "location": {
                "location_id": location.location_id,
                "name": location.name
            } if location else None,
            "minutes_remaining": credit.minutes_remaining,
            "expiry_date": credit.expiry_date,
            "days_expired": (today - credit.expiry_date).days if credit.expiry_date else None
        }
        result.append(credit_data)
    
    return result

@router.post("/admin/process-expired-credits", response_model=dict)
def process_expired_credits(
    *, session: SessionDep, current_user: GetAdminUser
) -> Any:
    """Zero out all expired credits (admin only)"""
    today = datetime.utcnow().date()
    
    # Find all expired credits with remaining minutes
    expired_credits = session.exec(
        select(Credit)
        .where(Credit.expiry_date < today)
        .where(Credit.minutes_remaining > 0)
    ).all()
    
    # Zero out all expired credits
    for credit in expired_credits:
        credit.minutes_remaining = 0
        session.add(credit)
    
    session.commit()
    
    return {
        "processed_count": len(expired_credits),
        "message": f"{len(expired_credits)} expired credits processed"
    }