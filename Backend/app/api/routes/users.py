from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, delete, func, select, SQLModel
from typing import Any, Dict, List, Optional
from datetime import datetime, date, timedelta

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    GetAdminUser,
)
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.role import Role
from app.models.child import Child
from app.models.visit import Visit
from app.utils.qr_code import generate_qr_code

router = APIRouter()

# User Management Routes
@router.get("/me", response_model=dict)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "fullname": current_user.fullname,
        "phone": current_user.phone,
        "role_id": current_user.role_id,
        "document_type": current_user.document_type,
        "document_number": current_user.document_number,
        "terms_accepted": current_user.terms_accepted,
        "is_active": current_user.is_active
    }

@router.patch("/me", response_model=dict)
def update_user_me(
    *, session: SessionDep, user_data: dict, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """
    if "email" in user_data:
        existing_user = crud.get_user_by_email(session=session, email=user_data["email"])
        if existing_user and existing_user.user_id != current_user.user_id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    
    # Update fields
    if "fullname" in user_data:
        current_user.fullname = user_data["fullname"]
    if "email" in user_data:
        current_user.email = user_data["email"]
    if "phone" in user_data:
        current_user.phone = user_data["phone"]
    if "document_type" in user_data:
        current_user.document_type = user_data["document_type"]
    if "document_number" in user_data:
        current_user.document_number = user_data["document_number"]
    if "terms_accepted" in user_data:
        current_user.terms_accepted = user_data["terms_accepted"]
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "fullname": current_user.fullname,
        "phone": current_user.phone,
        "message": "User updated successfully"
    }

@router.patch("/me/password", response_model=dict)
def update_password_me(
    *, session: SessionDep, password_data: dict, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")
    
    if not verify_password(current_password, current_user.hash_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    if current_password == new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    
    current_user.hash_password = get_password_hash(new_password)
    session.add(current_user)
    session.commit()
    
    return {"message": "Password updated successfully"}

@router.delete("/me", response_model=dict)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Delete own user account.
    """
    # Check for user's role
    role = session.get(Role, current_user.role_id)
    if role and role.role_name == "superadmin":
        raise HTTPException(
            status_code=403, detail="Super admins are not allowed to delete themselves"
        )
    
    # Check for any dependencies
    children = session.exec(
        select(Child).where(Child.parent_id == current_user.user_id)
    ).all()
    
    if children:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete account with associated children. Please remove or transfer children first."
        )
    
    # Soft delete by setting is_active to False
    current_user.is_active = False
    session.add(current_user)
    session.commit()
    
    return {"message": "User account deactivated successfully"}

@router.post("/signup", response_model=dict)
def register_user(*, session: SessionDep, user_data: dict) -> Any:
    """
    Create new user account.
    """
    # Check if email is already registered
    email = user_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    existing_user = crud.get_user_by_email(session=session, email=email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system"
        )
    
    # Get parent role
    parent_role = session.exec(
        select(Role).where(Role.role_name == "parent")
    ).first()
    
    if not parent_role:
        raise HTTPException(status_code=500, detail="Parent role not found in system")
    
    # Create new user
    new_user = User(
        email=email,
        fullname=user_data.get("fullname"),
        hash_password=get_password_hash(user_data.get("password")),
        role_id=parent_role.role_id,
        phone=user_data.get("phone"),
        document_type=user_data.get("document_type", "ID"),
        document_number=user_data.get("document_number", ""),
        terms_accepted=user_data.get("terms_accepted", False)
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return {
        "user_id": new_user.user_id,
        "email": new_user.email,
        "fullname": new_user.fullname,
        "message": "User registered successfully"
    }

# Child Management Routes
@router.post("/children", response_model=dict)
def register_child(
    *, session: SessionDep, current_user: CurrentUser, child_data: dict
) -> Any:
    """Register a child for current parent user"""
    # Create child profile
    new_child = Child(
        parent_id=current_user.user_id,
        fullname=child_data.get("fullname"),
        birth_date=child_data.get("birth_date"),
        allergies=child_data.get("allergies"),
        emergency_contact_name=child_data.get("emergency_contact_name"),
        emergency_contact_phone=child_data.get("emergency_contact_phone"),
        emergency_contact_relationship=child_data.get("emergency_contact_relationship"),
        special_notes=child_data.get("special_notes")
    )
    
    session.add(new_child)
    session.commit()
    session.refresh(new_child)
    
    return {
        "child_id": new_child.child_id,
        "fullname": new_child.fullname,
        "message": "Child registered successfully"
    }

@router.get("/children", response_model=List[dict])
def get_my_children(
    session: SessionDep, 
    current_user: CurrentUser,
    active_only: bool = True
) -> Any:
    """Get all children for the current parent user"""
    query = select(Child).where(Child.parent_id == current_user.user_id)
    
    if active_only:
        query = query.where(Child.is_active == True)
    
    children = session.exec(query).all()
    
    result = []
    for child in children:
        # Calculate age
        today = date.today()
        age = today.year - child.birth_date.year - ((today.month, today.day) < (child.birth_date.month, child.birth_date.day))
        
        result.append({
            "child_id": child.child_id,
            "fullname": child.fullname,
            "birth_date": child.birth_date,
            "age": age,
            "allergies": child.allergies,
            "emergency_contact_name": child.emergency_contact_name,
            "emergency_contact_phone": child.emergency_contact_phone,
            "emergency_contact_relationship": child.emergency_contact_relationship,
            "special_notes": child.special_notes,
            "is_active": child.is_active
        })
    
    return result

@router.get("/children/{child_id}", response_model=dict)
def get_child(
    *, session: SessionDep, current_user: CurrentUser, child_id: int
) -> Any:
    """Get a specific child by ID"""
    child = session.get(Child, child_id)
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Check if child belongs to current user
    if child.parent_id != current_user.user_id:
        # Check if current user is admin
        role = session.get(Role, current_user.role_id)
        is_admin = role and role.role_name in ["superadmin", "owner", "employee"]
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to view this child")
    
    # Calculate age
    today = date.today()
    age = today.year - child.birth_date.year - ((today.month, today.day) < (child.birth_date.month, child.birth_date.day))
    
    # Get recent visits if any
    recent_visits = session.exec(
        select(Visit)
        .where(Visit.child_id == child_id)
        .order_by(Visit.check_in_time.desc())
        .limit(5)
    ).all()
    
    visits_data = []
    for visit in recent_visits:
        visits_data.append({
            "visit_id": visit.visit_id,
            "check_in_time": visit.check_in_time,
            "check_out_time": visit.check_out_time,
            "visit_type": visit.visit_type,
            "minutes_used": visit.minutes_used
        })
    
    return {
        "child_id": child.child_id,
        "fullname": child.fullname,
        "birth_date": child.birth_date,
        "age": age,
        "allergies": child.allergies,
        "emergency_contact_name": child.emergency_contact_name,
        "emergency_contact_phone": child.emergency_contact_phone,
        "emergency_contact_relationship": child.emergency_contact_relationship,
        "special_notes": child.special_notes,
        "is_active": child.is_active,
        "recent_visits": visits_data
    }

@router.put("/children/{child_id}", response_model=dict)
def update_child(
    *, session: SessionDep, current_user: CurrentUser, child_id: int, child_data: dict
) -> Any:
    """Update a child's information"""
    child = session.get(Child, child_id)
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Check if child belongs to current user
    if child.parent_id != current_user.user_id:
        # Check if current user is admin
        role = session.get(Role, current_user.role_id)
        is_admin = role and role.role_name in ["superadmin", "owner", "employee"]
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to update this child")
    
    # Update fields
    if "fullname" in child_data:
        child.fullname = child_data["fullname"]
    if "birth_date" in child_data:
        child.birth_date = child_data["birth_date"]
    if "allergies" in child_data:
        child.allergies = child_data["allergies"]
    if "emergency_contact_name" in child_data:
        child.emergency_contact_name = child_data["emergency_contact_name"]
    if "emergency_contact_phone" in child_data:
        child.emergency_contact_phone = child_data["emergency_contact_phone"]
    if "emergency_contact_relationship" in child_data:
        child.emergency_contact_relationship = child_data["emergency_contact_relationship"]
    if "special_notes" in child_data:
        child.special_notes = child_data["special_notes"]
    if "is_active" in child_data:
        # Only parent or admin can change active status
        role = session.get(Role, current_user.role_id)
        is_admin = role and role.role_name in ["superadmin", "owner", "employee"]
        if current_user.user_id == child.parent_id or is_admin:
            child.is_active = child_data["is_active"]
    
    session.add(child)
    session.commit()
    session.refresh(child)
    
    return {
        "child_id": child.child_id,
        "fullname": child.fullname,
        "message": "Child updated successfully"
    }

@router.delete("/children/{child_id}", response_model=dict)
def deactivate_child(
    *, session: SessionDep, current_user: CurrentUser, child_id: int
) -> Any:
    """Deactivate a child profile"""
    child = session.get(Child, child_id)
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Check if child belongs to current user
    if child.parent_id != current_user.user_id:
        # Check if current user is admin
        role = session.get(Role, current_user.role_id)
        is_admin = role and role.role_name in ["superadmin", "owner", "employee"]
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to deactivate this child")
    
    # Check for active visits
    active_visit = session.exec(
        select(Visit)
        .where(Visit.child_id == child_id)
        .where(Visit.check_out_time == None)
    ).first()
    
    if active_visit:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate child with active visits. Please check out any active visits first."
        )
    
    # Soft delete by setting is_active to False
    child.is_active = False
    session.add(child)
    session.commit()
    
    return {"message": "Child profile deactivated successfully"}

@router.get("/children/{child_id}/qr", response_model=dict)
def generate_child_qr(
    *, session: SessionDep, current_user: CurrentUser, child_id: int
) -> Any:
    """Generate QR code for child check-in/out"""
    child = session.get(Child, child_id)
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Check if child belongs to current user
    if child.parent_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to generate QR for this child")
    
    # Generate QR code data
    qr_data = f"CHILD:{child_id}:{datetime.utcnow().isoformat()}"
    qr_code = generate_qr_code(qr_data)
    
    return {
        "child_id": child_id,
        "child_name": child.fullname,
        "qr_code": qr_code
    }

# Admin routes
@router.get(
    "/",
    dependencies=[Depends(GetAdminUser)],
    response_model=List[dict],
)
def read_users(
    session: SessionDep, 
    skip: int = 0, 
    limit: int = 100,
    role: Optional[str] = None
) -> Any:
    """
    Retrieve users (admin only).
    """
    query = select(User)
    
    if role:
        # Get role ID for the requested role name
        role_obj = session.exec(
            select(Role).where(Role.role_name == role)
        ).first()
        
        if role_obj:
            query = query.where(User.role_id == role_obj.role_id)
    
    query = query.offset(skip).limit(limit)
    users = session.exec(query).all()
    
    result = []
    for user in users:
        # Get role info
        role = session.get(Role, user.role_id)
        
        user_data = {
            "user_id": user.user_id,
            "email": user.email,
            "fullname": user.fullname,
            "phone": user.phone,
            "role": {
                "role_id": role.role_id,
                "role_name": role.role_name
            } if role else None,
            "is_active": user.is_active,
            "created_at": user.created_at
        }
        result.append(user_data)
    
    return result

@router.post(
    "/", 
    dependencies=[Depends(GetAdminUser)], 
    response_model=dict
)
def create_user(*, session: SessionDep, user_data: dict) -> Any:
    """
    Create new user (admin only).
    """
    # Check if email is already registered
    email = user_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    existing_user = crud.get_user_by_email(session=session, email=email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system"
        )
    
    # Verify role exists
    role_id = user_data.get("role_id")
    if not role_id:
        raise HTTPException(status_code=400, detail="Role ID is required")
    
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Create new user
    new_user = User(
        email=email,
        fullname=user_data.get("fullname"),
        hash_password=get_password_hash(user_data.get("password")),
        role_id=role_id,
        phone=user_data.get("phone"),
        document_type=user_data.get("document_type", "ID"),
        document_number=user_data.get("document_number", ""),
        terms_accepted=True,  # Admin-created accounts have terms pre-accepted
        location_id=user_data.get("location_id")  # For staff users
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return {
        "user_id": new_user.user_id,
        "email": new_user.email,
        "fullname": new_user.fullname,
        "role": role.role_name,
        "message": "User created successfully"
    }

@router.get("/{user_id}", response_model=dict)
def read_user_by_id(
    user_id: int, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Regular users can only view their own profile
    if user.user_id != current_user.user_id:
        # Check if current user is admin
        role = session.get(Role, current_user.role_id)
        is_admin = role and role.role_name in ["superadmin", "owner", "employee"]
        
        if not is_admin:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to view this user"
            )
    
    # Get role info
    role = session.get(Role, user.role_id)
    
    # Get children if this is a parent
    children = []
    if role and role.role_name == "parent":
        children_objs = session.exec(
            select(Child).where(Child.parent_id == user.user_id)
        ).all()
        
        children = [
            {
                "child_id": child.child_id,
                "fullname": child.fullname,
                "birth_date": child.birth_date
            }
            for child in children_objs
        ]
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "fullname": user.fullname,
        "phone": user.phone,
        "role": {
            "role_id": role.role_id,
            "role_name": role.role_name
        } if role else None,
        "document_type": user.document_type,
        "document_number": user.document_number,
        "terms_accepted": user.terms_accepted,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "location_id": user.location_id,
        "children": children
    }

@router.put(
    "/{user_id}",
    dependencies=[Depends(GetAdminUser)],
    response_model=dict,
)
def update_user(
    *,
    session: SessionDep,
    user_id: int,
    user_data: dict,
) -> Any:
    """
    Update a user (admin only).
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    
    # Check email uniqueness if changing
    if "email" in user_data:
        existing_user = crud.get_user_by_email(session=session, email=user_data["email"])
        if existing_user and existing_user.user_id != user_id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
        user.email = user_data["email"]
    
    # Update other fields
    if "fullname" in user_data:
        user.fullname = user_data["fullname"]
    if "phone" in user_data:
        user.phone = user_data["phone"]
    if "role_id" in user_data:
        role = session.get(Role, user_data["role_id"])
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        user.role_id = user_data["role_id"]
    if "document_type" in user_data:
        user.document_type = user_data["document_type"]
    if "document_number" in user_data:
        user.document_number = user_data["document_number"]
    if "location_id" in user_data:
        user.location_id = user_data["location_id"]
    if "is_active" in user_data:
        user.is_active = user_data["is_active"]
    if "password" in user_data:
        user.hash_password = get_password_hash(user_data["password"])
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "fullname": user.fullname,
        "message": "User updated successfully"
    }

@router.delete(
    "/{user_id}",
    dependencies=[Depends(GetAdminUser)],
    response_model=dict,
)
def delete_user(
    session: SessionDep, user_id: int
) -> Any:
    """
    Delete a user (admin only).
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is a superadmin
    role = session.get(Role, user.role_id)
    if role and role.role_name == "superadmin":
        raise HTTPException(
            status_code=403, 
            detail="Super admins cannot be deleted"
        )
    
    # Check for dependencies
    children = session.exec(
        select(Child).where(Child.parent_id == user_id)
    ).all()
    
    if children:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete user with associated children. Please reassign or remove children first."
        )
    
    # Soft delete by setting is_active to False
    user.is_active = False
    session.add(user)
    session.commit()
    
    return {"message": "User deactivated successfully"}

@router.get("/roles", response_model=List[dict])
def get_all_roles(
    session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get all available roles
    """
    # Check if current user is admin
    role = session.get(Role, current_user.role_id)
    is_admin = role and role.role_name in ["superadmin", "owner"]
    
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view roles"
        )
    
    roles = session.exec(select(Role)).all()
    
    return [
        {
            "role_id": role.role_id,
            "role_name": role.role_name,
            "description": role.description
        }
        for role in roles
    ]

@router.get("/staff", response_model=List[dict])
def get_staff_users(
    session: SessionDep,
    current_user: GetAdminUser,
    location_id: Optional[int] = None
) -> Any:
    """
    Get all staff users (employees) for assignment to zones/services
    """
    # Get employee role
    employee_role = session.exec(
        select(Role).where(Role.role_name == "employee")
    ).first()
    
    if not employee_role:
        return []
    
    # Get staff users
    query = select(User).where(User.role_id == employee_role.role_id)
    
    if location_id:
        query = query.where((User.location_id == location_id) | (User.location_id == None))
    
    staff = session.exec(query).all()
    
    return [
        {
            "user_id": user.user_id,
            "fullname": user.fullname,
            "email": user.email,
            "phone": user.phone,
            "location_id": user.location_id
        }
        for user in staff
    ]

@router.get("/parents", response_model=List[dict])
def get_parent_users(
    session: SessionDep,
    current_user: GetAdminUser,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Get all parent users for administrative purposes
    """
    # Get parent role
    parent_role = session.exec(
        select(Role).where(Role.role_name == "parent")
    ).first()
    
    if not parent_role:
        return []
    
    # Build query
    query = select(User).where(User.role_id == parent_role.role_id)
    
    # Add search filter if provided
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (User.fullname.like(search_term)) | 
            (User.email.like(search_term)) |
            (User.document_number.like(search_term))
        )
    
    query = query.offset(skip).limit(limit)
    parents = session.exec(query).all()
    
    result = []
    for parent in parents:
        # Count children
        children_count = session.exec(
            select(func.count(Child.child_id))
            .where(Child.parent_id == parent.user_id)
        ).one()
        
        result.append({
            "user_id": parent.user_id,
            "fullname": parent.fullname,
            "email": parent.email,
            "phone": parent.phone,
            "children_count": children_count,
            "created_at": parent.created_at
        })
    
    return result

# Admin routes for child management
@router.get("/admin/children", response_model=List[dict])
def get_all_children(
    session: SessionDep,
    current_user: GetAdminUser,
    parent_id: Optional[int] = None,
    active_only: bool = True,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all children (admin only)"""
    query = select(Child)
    
    if parent_id:
        query = query.where(Child.parent_id == parent_id)
    
    if active_only:
        query = query.where(Child.is_active == True)
    
    query = query.offset(skip).limit(limit)
    children = session.exec(query).all()
    
    result = []
    for child in children:
        # Get parent info
        parent = session.get(User, child.parent_id)
        
        # Calculate age
        today = date.today()
        age = today.year - child.birth_date.year - ((today.month, today.day) < (child.birth_date.month, child.birth_date.day))
        
        result.append({
            "child_id": child.child_id,
            "fullname": child.fullname,
            "birth_date": child.birth_date,
            "age": age,
            "parent": {
                "user_id": parent.user_id,
                "fullname": parent.fullname,
                "email": parent.email
            } if parent else None,
            "allergies": child.allergies,
            "special_notes": child.special_notes,
            "is_active": child.is_active
        })
    
    return result

@router.post("/admin/children", response_model=dict)
def admin_create_child(
    *, session: SessionDep, current_user: GetAdminUser, child_data: dict
) -> Any:
    """Create a child profile (admin only)"""
    # Verify parent exists
    parent_id = child_data.get("parent_id")
    if not parent_id:
        raise HTTPException(status_code=400, detail="Parent ID is required")
    
    parent = session.get(User, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    # Create child profile
    new_child = Child(
        parent_id=parent_id,
        fullname=child_data.get("fullname"),
        birth_date=child_data.get("birth_date"),
        allergies=child_data.get("allergies"),
        emergency_contact_name=child_data.get("emergency_contact_name"),
        emergency_contact_phone=child_data.get("emergency_contact_phone"),
        emergency_contact_relationship=child_data.get("emergency_contact_relationship"),
        special_notes=child_data.get("special_notes")
    )
    
    session.add(new_child)
    session.commit()
    session.refresh(new_child)
    
    return {
        "child_id": new_child.child_id,
        "fullname": new_child.fullname,
        "parent_id": parent_id,
        "message": "Child created successfully"
    }

@router.put("/admin/children/{child_id}", response_model=dict)
def admin_update_child(
    *, session: SessionDep, current_user: GetAdminUser, child_id: int, child_data: dict
) -> Any:
    """Update a child's information (admin only)"""
    child = session.get(Child, child_id)
    
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Update fields
    if "fullname" in child_data:
        child.fullname = child_data["fullname"]
    if "birth_date" in child_data:
        child.birth_date = child_data["birth_date"]
    if "allergies" in child_data:
        child.allergies = child_data["allergies"]
    if "emergency_contact_name" in child_data:
        child.emergency_contact_name = child_data["emergency_contact_name"]
    if "emergency_contact_phone" in child_data:
        child.emergency_contact_phone = child_data["emergency_contact_phone"]
    if "emergency_contact_relationship" in child_data:
        child.emergency_contact_relationship = child_data["emergency_contact_relationship"]
    if "special_notes" in child_data:
        child.special_notes = child_data["special_notes"]
    if "is_active" in child_data:
        child.is_active = child_data["is_active"]
    if "parent_id" in child_data:
        # Verify new parent exists
        parent_id = child_data["parent_id"]
        parent = session.get(User, parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent not found")
        
        # Update parent
        child.parent_id = parent_id
    
    session.add(child)
    session.commit()
    session.refresh(child)
    
    return {
        "child_id": child.child_id,
        "fullname": child.fullname,
        "parent_id": child.parent_id,
        "message": "Child updated successfully"
    }

@router.get("/admin/children/visits", response_model=List[dict])
def get_children_visits(
    session: SessionDep,
    current_user: GetAdminUser,
    child_id: Optional[int] = None,
    parent_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get visit history for children (admin only)"""
    # Build base query
    query = (
        select(Visit, Child, User)
        .join(Child, Visit.child_id == Child.child_id)
        .join(User, Child.parent_id == User.user_id)
    )
    
    # Apply filters
    if child_id:
        query = query.where(Visit.child_id == child_id)
    
    if parent_id:
        query = query.where(Child.parent_id == parent_id)
    
    # Date range filters
    if start_date:
        start = datetime.fromisoformat(start_date)
        query = query.where(Visit.check_in_time >= start)
    
    if end_date:
        end = datetime.fromisoformat(end_date)
        query = query.where(Visit.check_in_time <= end)
    
    # Order by most recent first
    query = query.order_by(Visit.check_in_time.desc()).offset(skip).limit(limit)
    
    visits = session.exec(query).all()
    
    result = []
    for visit, child, parent in visits:
        result.append({
            "visit_id": visit.visit_id,
            "child": {
                "child_id": child.child_id,
                "fullname": child.fullname
            },
            "parent": {
                "user_id": parent.user_id,
                "fullname": parent.fullname,
                "email": parent.email
            },
            "check_in_time": visit.check_in_time,
            "check_out_time": visit.check_out_time,
            "minutes_used": visit.minutes_used,
            "visit_type": visit.visit_type,
            "status": "completed" if visit.check_out_time else "active"
        })
    
    return result

@router.get("/admin/reports/user-activity", response_model=dict)
def user_activity_report(
    session: SessionDep,
    current_user: GetAdminUser,
    days: int = 30
) -> Any:
    """Generate report on user activity"""
    # Set date ranges
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get parent role
    parent_role = session.exec(
        select(Role).where(Role.role_name == "parent")
    ).first()
    
    if not parent_role:
        return {
            "total_users": 0,
            "new_users": 0,
            "active_users": 0
        }
    
    # Total users
    total_users = session.exec(
        select(func.count(User.user_id))
        .where(User.role_id == parent_role.role_id)
    ).one() or 0
    
    # New users in the period
    new_users = session.exec(
        select(func.count(User.user_id))
        .where(User.role_id == parent_role.role_id)
        .where(User.created_at.between(start_date, end_date))
    ).one() or 0
    
    # Active users (with visits in the period)
    active_users = session.exec(
        select(func.count(User.user_id.distinct()))
        .where(User.role_id == parent_role.role_id)
        .join(Child, User.user_id == Child.parent_id)
        .join(Visit, Child.child_id == Visit.child_id)
        .where(Visit.check_in_time.between(start_date, end_date))
    ).one() or 0
    
    # User registrations by day
    registrations_by_day = []
    for i in range(days):
        day_date = start_date + timedelta(days=i)
        next_day = day_date + timedelta(days=1)
        
        day_count = session.exec(
            select(func.count(User.user_id))
            .where(User.role_id == parent_role.role_id)
            .where(User.created_at >= day_date)
            .where(User.created_at < next_day)
        ).one() or 0
        
        registrations_by_day.append({
            "date": day_date.date().isoformat(),
            "count": day_count
        })
    
    # Top active users
    top_users = session.exec(
        select(
            User.user_id,
            User.fullname,
            User.email,
            func.count(Visit.visit_id).label("visit_count")
        )
        .where(User.role_id == parent_role.role_id)
        .join(Child, User.user_id == Child.parent_id)
        .join(Visit, Child.child_id == Visit.child_id)
        .where(Visit.check_in_time.between(start_date, end_date))
        .group_by(User.user_id, User.fullname, User.email)
        .order_by(func.count(Visit.visit_id).desc())
        .limit(10)
    ).all()
    
    top_users_data = [
        {
            "user_id": user_id,
            "fullname": fullname,
            "email": email,
            "visits": visit_count
        }
        for user_id, fullname, email, visit_count in top_users
    ]
    
    return {
        "total_users": total_users,
        "new_users": new_users,
        "active_users": active_users,
        "active_percentage": round((active_users / total_users) * 100 if total_users > 0 else 0, 1),
        "registrations_by_day": registrations_by_day,
        "top_active_users": top_users_data,
        "date_range": {
            "start_date": start_date.date().isoformat(),
            "end_date": end_date.date().isoformat(),
            "days": days
        }
    }

@router.get("/admin/reports/children-demographics", response_model=dict)
def children_demographics_report(
    session: SessionDep,
    current_user: GetAdminUser
) -> Any:
    """Generate report on children demographics"""
    # Total children
    total_children = session.exec(
        select(func.count(Child.child_id))
    ).one() or 0
    
    # Age distribution
    age_distribution = session.exec(
        select(
            func.extract('year', func.age(func.current_date(), Child.birth_date)).label("age"),
            func.count(Child.child_id)
        )
        .group_by(func.extract('year', func.age(func.current_date(), Child.birth_date)))
        .order_by("age")
    ).all()
    
    age_groups = [
        {"age": int(age), "count": count}
        for age, count in age_distribution
    ]
    
    # Children with allergies
    allergies_count = session.exec(
        select(func.count(Child.child_id))
        .where(Child.allergies != None)
        .where(Child.allergies != "")
    ).one() or 0
    
    # Average children per parent
    parent_role = session.exec(
        select(Role).where(Role.role_name == "parent")
    ).first()
    
    if parent_role:
        total_parents = session.exec(
            select(func.count(User.user_id))
            .where(User.role_id == parent_role.role_id)
        ).one() or 0
        
        avg_children_per_parent = total_children / total_parents if total_parents > 0 else 0
    else:
        total_parents = 0
        avg_children_per_parent = 0
    
    # Parents with multiple children
    if parent_role:
        parents_with_multiple = session.exec(
            select(func.count(User.user_id.distinct()))
            .where(User.role_id == parent_role.role_id)
            .join(Child, User.user_id == Child.parent_id)
            .group_by(User.user_id)
            .having(func.count(Child.child_id) > 1)
        ).all()
        
        multiple_children_parents = len(parents_with_multiple)
    else:
        multiple_children_parents = 0
    
    return {
        "total_children": total_children,
        "age_distribution": age_groups,
        "allergies_count": allergies_count,
        "allergies_percentage": round((allergies_count / total_children) * 100 if total_children > 0 else 0, 1),
        "total_parents": total_parents,
        "avg_children_per_parent": round(avg_children_per_parent, 2),
        "multiple_children_parents": multiple_children_parents,
        "multiple_children_percentage": round((multiple_children_parents / total_parents) * 100 if total_parents > 0 else 0, 1)
    }