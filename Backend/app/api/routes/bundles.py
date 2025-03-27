from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select
from typing import Any, Optional, List
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models.bundle import Bundle
from app.models.bundle_service import BundleService
from app.models.service import Service
from app.models.location import Location

router = APIRouter()

# Admin routes for bundle management
@router.post("/", response_model=dict)
def create_bundle(
    *, session: SessionDep, current_user: GetAdminUser, bundle_data: dict
) -> Any:
    """Create a new service bundle (admin only)"""
    # Verify location exists
    location_id = bundle_data.get("location_id")
    location = session.get(Location, location_id)
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Create bundle
    new_bundle = Bundle(
        location_id=location_id,
        name=bundle_data.get("name"),
        description=bundle_data.get("description"),
        price=bundle_data.get("price"),
        is_subscription=bundle_data.get("is_subscription", False),
        duration_days=bundle_data.get("duration_days")
    )
    
    session.add(new_bundle)
    session.commit()
    session.refresh(new_bundle)
    
    # Add services to the bundle if provided
    if "services" in bundle_data and isinstance(bundle_data["services"], list):
        for service_item in bundle_data["services"]:
            service_id = service_item.get("service_id")
            quantity = service_item.get("quantity", 1)
            
            # Verify service exists
            service = session.get(Service, service_id)
            if not service:
                continue  # Skip invalid services
            
            # Add service to bundle
            bundle_service = BundleService(
                bundle_id=new_bundle.bundle_id,
                service_id=service_id,
                quantity=quantity
            )
            
            session.add(bundle_service)
        
        session.commit()
    
    return {
        "bundle_id": new_bundle.bundle_id,
        "message": "Bundle created successfully"
    }

@router.put("/{bundle_id}", response_model=dict)
def update_bundle(
    *, session: SessionDep, current_user: GetAdminUser, bundle_id: int, bundle_data: dict
) -> Any:
    """Update an existing bundle (admin only)"""
    bundle = session.get(Bundle, bundle_id)
    
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    # Update basic bundle information
    if "name" in bundle_data:
        bundle.name = bundle_data["name"]
    if "description" in bundle_data:
        bundle.description = bundle_data["description"]
    if "price" in bundle_data:
        bundle.price = bundle_data["price"]
    if "is_subscription" in bundle_data:
        bundle.is_subscription = bundle_data["is_subscription"]
    if "duration_days" in bundle_data:
        bundle.duration_days = bundle_data["duration_days"]
    if "is_active" in bundle_data:
        bundle.is_active = bundle_data["is_active"]
    
    session.add(bundle)
    session.commit()
    
    # Update services if provided
    if "services" in bundle_data and isinstance(bundle_data["services"], list):
        # Remove existing bundle services
        session.exec(
            select(BundleService).where(BundleService.bundle_id == bundle_id)
        ).delete()
        
        # Add new services
        for service_item in bundle_data["services"]:
            service_id = service_item.get("service_id")
            quantity = service_item.get("quantity", 1)
            
            # Verify service exists
            service = session.get(Service, service_id)
            if not service:
                continue  # Skip invalid services
            
            # Add service to bundle
            bundle_service = BundleService(
                bundle_id=bundle_id,
                service_id=service_id,
                quantity=quantity
            )
            
            session.add(bundle_service)
        
        session.commit()
    
    return {
        "bundle_id": bundle.bundle_id,
        "message": "Bundle updated successfully"
    }

@router.delete("/{bundle_id}", response_model=dict)
def deactivate_bundle(
    *, session: SessionDep, current_user: GetAdminUser, bundle_id: int
) -> Any:
    """Deactivate a bundle (admin only)"""
    bundle = session.get(Bundle, bundle_id)
    
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    # Soft delete by setting is_active to False
    bundle.is_active = False
    session.add(bundle)
    session.commit()
    
    return {"message": "Bundle deactivated successfully"}

@router.post("/{bundle_id}/services", response_model=dict)
def add_service_to_bundle(
    *, session: SessionDep, current_user: GetAdminUser, bundle_id: int, service_data: dict
) -> Any:
    """Add a service to a bundle (admin only)"""
    bundle = session.get(Bundle, bundle_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    service_id = service_data.get("service_id")
    quantity = service_data.get("quantity", 1)
    
    # Verify service exists
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if service is already in bundle
    existing = session.exec(
        select(BundleService)
        .where(BundleService.bundle_id == bundle_id)
        .where(BundleService.service_id == service_id)
    ).first()
    
    if existing:
        # Update quantity
        existing.quantity = quantity
        session.add(existing)
    else:
        # Add new service to bundle
        bundle_service = BundleService(
            bundle_id=bundle_id,
            service_id=service_id,
            quantity=quantity
        )
        session.add(bundle_service)
    
    session.commit()
    
    return {
        "bundle_id": bundle_id,
        "service_id": service_id,
        "message": "Service added to bundle successfully"
    }

@router.delete("/{bundle_id}/services/{service_id}", response_model=dict)
def remove_service_from_bundle(
    *, session: SessionDep, current_user: GetAdminUser, bundle_id: int, service_id: int
) -> Any:
    """Remove a service from a bundle (admin only)"""
    bundle_service = session.exec(
        select(BundleService)
        .where(BundleService.bundle_id == bundle_id)
        .where(BundleService.service_id == service_id)
    ).first()
    
    if not bundle_service:
        raise HTTPException(status_code=404, detail="Service not found in bundle")
    
    session.delete(bundle_service)
    session.commit()
    
    return {"message": "Service removed from bundle successfully"}