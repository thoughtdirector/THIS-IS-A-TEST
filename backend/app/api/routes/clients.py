from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select, func
from typing import Any, Optional, List
from datetime import timedelta
from datetime import datetime
import uuid
from app.api.deps import (CurrentUser, SessionDep, GetAdminUser, GetClientGroupFromPath, GetClientFromPath, 
                          GetClientFromBody, GetClientGroupFromBody, GetClientGroupFromQuery)
from app.models import (
    Client, ClientCreate, ClientUpdate, ClientPublic, Message,
    Reservation, ReservationCreate, ReservationPublic,
    Subscription, SubscriptionCreate, SubscriptionPublic,
    Payment, PaymentCreate, PaymentPublic, Visit, VisitPublic, QRCode, ClientGroup, Plan, PlanInstance, PlanInstanceCreate, 
    PlanInstancePublic
)
from app.services.epayco import generate_payment_url


router = APIRouter()

# Client Management Routes
@router.post("/register", response_model=ClientPublic)
def register_client(
    *, session: SessionDep, client_in: ClientCreate
) -> Any:
    """Register a new client without assigning to a group"""
    client = Client.model_validate(client_in)
    # Generate QR code after saving to get ID
    session.add(client)
    session.commit()
    session.refresh(client)
    
    # Create QR code entry
    qr_code = QRCode(client_id=client.id)
    session.add(qr_code)
    
    # Update client with QR code ID
    client.qr_code = str(qr_code.id)
    session.add(client)
    session.commit()
    session.refresh(client)
    
    return client

@router.post("/register/child", response_model=ClientPublic)
def register_child(
    *, session: SessionDep, current_user: CurrentUser, client_in: ClientCreate
) -> Any:
    """Register a child for current guardian and add to same group"""
    # Find the parent client associated with the current user
    parent_client = session.exec(
        select(Client).where(Client.user_id == current_user.id)
    ).first()
    
    if not parent_client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No client profile found for current user"
        )
    
    # Create child client
    client = Client.model_validate(client_in)
    client.guardian_id = parent_client.id
    client.is_child = True
    
    # Add child to the same group as parent
    if parent_client.group_id:
        client.group_id = parent_client.group_id
    
    # Save client to generate ID
    session.add(client)
    session.commit()
    session.refresh(client)
    
    # Create QR code entry
    qr_code = QRCode(client_id=client.id)
    session.add(qr_code)
    
    # Update client with QR code ID
    client.qr_code = str(qr_code.id)
    session.add(client)
    session.commit()
    session.refresh(client)
    
    return client

@router.post("/group/{group_id}/client", response_model=ClientPublic)
def register_client_in_group(
    *, 
    session: SessionDep, 
    client_group: GetClientGroupFromPath,
    client_in: ClientCreate
) -> Any:
    """Register a new client directly into a specific group"""
    client = Client.model_validate(client_in)
    client.group_id = client_group.id
    
    # Generate QR code for the client
    session.add(client)
    session.commit()  # Commit to generate the ID
    session.refresh(client)
    
    # Create QR code entry
    qr_code = QRCode(client_id=client.id)
    session.add(qr_code)
    
    # Update client with QR code ID
    client.qr_code = str(qr_code.id)
    session.add(client)
    session.commit()
    session.refresh(client)
    
    return client

@router.post("/{parent_id}/child", response_model=ClientPublic)
def register_child_client(
    *, 
    session: SessionDep, 
    parent_id: uuid.UUID, 
    client_in: ClientCreate
) -> Any:
    """Register a child client for a parent"""
    # Verify parent exists
    parent = session.get(Client, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent client not found")
    
    client = Client.model_validate(client_in)
    client.is_child = True
    client.guardian_id = parent_id
    
    # Automatically add child to the same group as parent
    if parent.group_id:
        client.group_id = parent.group_id
    
    # Generate QR code for the client
    session.add(client)
    session.commit()  # Commit to generate the ID
    session.refresh(client)
    
    # Create QR code entry
    qr_code = QRCode(client_id=client.id)
    session.add(qr_code)
    
    # Update client with QR code ID
    client.qr_code = str(qr_code.id)
    session.add(client)
    session.commit()
    session.refresh(client)
    
    return client

@router.post("/group/{group_id}/admin/{client_id}", response_model=dict)
def add_group_admin(
    *,
    session: SessionDep,
    current_user: GetAdminUser,
    group_id: uuid.UUID,
    client_id: uuid.UUID
) -> Any:
    """Add a client as an admin to a client group"""
    # Verify group exists
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    # Verify client exists
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Make client a group admin by updating the client record
    client.group_admin = client_group
    session.add(client)
    session.commit()
    
    return {"message": f"Client {client_id} added as admin to group {group_id}"}

@router.delete("/group/{group_id}/admin/{client_id}", response_model=dict)
def remove_group_admin(
    *,
    session: SessionDep,
    current_user: GetAdminUser,
    group_id: uuid.UUID,
    client_id: uuid.UUID
) -> Any:
    """Remove a client as an admin from a client group"""
    # Verify group exists
    client_group = session.get(ClientGroup, group_id)
    if not client_group:
        raise HTTPException(status_code=404, detail="Client group not found")
    
    # Verify client exists
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if client is an admin of this group
    if client.group_admin and client.group_admin.id == group_id:
        client.group_admin = None
        session.add(client)
        session.commit()
        return {"message": f"Client {client_id} removed as admin from group {group_id}"}
    else:
        raise HTTPException(
            status_code=400,
            detail="Client is not an admin of this group"
        )

@router.get("", response_model=List[ClientPublic])
def get_all_clients(
    session: SessionDep,
    client_group: GetClientGroupFromQuery,
    skip: int = 0,
    limit: int = 100,
    is_child: Optional[bool] = None
) -> Any:
    """Get all clients in a specific group with filtering options"""
    statement = select(Client).where(Client.group_id == client_group.id)
    
    # Apply filters if provided
    if is_child is not None:
        statement = statement.where(Client.is_child == is_child)
        
    statement = statement.offset(skip).limit(limit)
    clients = session.exec(statement).all()
    return clients

@router.get("/{client_id}", response_model=ClientPublic)
def get_client(
    *, 
    client: GetClientFromPath
) -> Any:

    """Get a specific client by ID (using dependency)"""
    return client

@router.put("/{client_id}", response_model=ClientPublic)
def update_client(
    *, 
    session: SessionDep, 
    client: GetClientFromPath,
    client_in: ClientUpdate
) -> Any:
    """Update a client"""
    # Update client attributes from input
    client_data = client_in.model_dump(exclude_unset=True)
    for key, value in client_data.items():
        setattr(client, key, value)
    
    # If guardian_id is being updated, verify the guardian exists
    if client_in.guardian_id is not None:
        guardian = session.get(Client, client_in.guardian_id)
        if not guardian:
            raise HTTPException(status_code=404, detail="Guardian client not found")
        
        # If guardian belongs to a group, consider updating child's group as well
        if guardian.group_id and client.group_id != guardian.group_id:
            client.group_id = guardian.group_id
    
    client.updated_at = datetime.utcnow()
    session.add(client)
    session.commit()
    session.refresh(client)
    return client

@router.delete("/{client_id}", response_model=dict)
def delete_client(
    *, 
    session: SessionDep, 
    client: GetClientFromPath
) -> Any:
    """Delete a client"""
    # Check if client has children
    children = session.exec(
        select(Client).where(Client.guardian_id == client.id)
    ).all()
    
    if children:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete client with children. Update or remove children first."
        )
    
    # Delete QR codes associated with the client
    qr_codes = session.exec(
        select(QRCode).where(QRCode.client_id == client.id)
    ).all()
    
    for qr_code in qr_codes:
        session.delete(qr_code)
    
    # Update group_admin reference if client is an admin
    if client.group_admin:
        client.group_admin = None
        session.add(client)
        session.commit()
    
    session.delete(client)
    session.commit()
    
    return {"message": "Client successfully deleted"}

@router.get("/available-plans", response_model=List[Plan])
def get_available_plans(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True
) -> Any:
    """Get all available plans for clients"""
    statement = select(Plan)
    
    if active_only:
        statement = statement.where(Plan.is_active == True)
    
    statement = statement.offset(skip).limit(limit)
    plans = session.exec(statement).all()
    return plans

@router.get("/client-groups", response_model=List[ClientGroup])
async def get_client_groups(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all client groups where the current user is an admin"""
    # Get the client associated with the current user
    client = session.exec(
        select(Client).where(Client.user_id == current_user.id)
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found for current user")
    
    # Get groups where this client is an admin
    statement = select(ClientGroup).where(
        ClientGroup.id.in_(
            select(ClientGroup.id).join(Client, ClientGroup.admins).where(Client.id == client.id)
        )
    ).offset(skip).limit(limit)
    
    groups = session.exec(statement).all()
    return groups

@router.post("/plan-instances", response_model=PlanInstancePublic)
async def create_plan_instance(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    instance_in: PlanInstanceCreate
) -> Any:
    """Create a new plan instance for a client group"""
    # Verify client is admin of the group
    client = session.exec(
        select(Client).where(Client.user_id == current_user.id)
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found for current user")
    
    # Check if client is admin of the group
    client_group = session.exec(
        select(ClientGroup)
        .where(ClientGroup.id == instance_in.client_group_id)
        .where(ClientGroup.id.in_(
            select(ClientGroup.id).join(Client, ClientGroup.admins).where(Client.id == client.id)
        ))
    ).first()
    
    if not client_group:
        raise HTTPException(
            status_code=403, 
            detail="You don't have permission to create plan instances for this group"
        )
    
    # Verify plan exists
    plan = session.exec(select(Plan).where(Plan.id == instance_in.plan_id)).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Calculate total cost based on plan and addons
    total_cost = plan.price
    purchased_addons = instance_in.purchased_addons or {}
    
    # Add costs of selected addons
    for addon_name, quantity in purchased_addons.items():
        if addon_name in plan.addons:
            total_cost += plan.addons[addon_name] * quantity
    
    # Create plan instance
    plan_instance = PlanInstance(
        client_group_id=instance_in.client_group_id,
        plan_id=instance_in.plan_id,
        start_date=instance_in.start_date,
        end_date=instance_in.end_date,
        total_cost=total_cost,
        paid_amount=0,  # Initially no payment
        remaining_entries=instance_in.remaining_entries or plan.entries,
        remaining_limits=plan.limits.copy() if plan.limits else {},
        purchased_addons=purchased_addons
    )
    
    session.add(plan_instance)
    session.commit()
    session.refresh(plan_instance)
    
    # If payment method is specified, create a payment record
    payment_method = instance_in.payment_method if hasattr(instance_in, 'payment_method') else None
    payment_url = None
    
    if payment_method:
        # Create payment record
        payment = Payment(
            client_group_id=instance_in.client_group_id,
            amount=total_cost,
            status="pending",
            payment_method=payment_method,
            transaction_id=str(uuid.uuid4()),  # Generate a transaction ID
            plan_id=plan.id,
            plan_instance_id=plan_instance.id,
            purchased_addons=purchased_addons
        )
        
        session.add(payment)
        session.commit()
        
        # If payment method is credit card, generate payment URL
        if payment_method == "credit_card":
            payment_url = generate_payment_url(
                payment_id=payment.id,
                amount=total_cost,
                description=f"Payment for {plan.name}",
                client_name=client.full_name,
                client_email=client.email
            )
    
    # Return the plan instance with payment URL if applicable
    result = plan_instance.dict()
    if payment_url:
        result["payment_url"] = payment_url
    
    return result

@router.get("/plan-instances", response_model=List[PlanInstancePublic])
async def get_client_plan_instances(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False
) -> Any:
    """Get all plan instances for client groups where the current user is an admin"""
    # Get the client associated with the current user
    client = session.exec(
        select(Client).where(Client.user_id == current_user.id)
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found for current user")
    
    # Get plan instances for groups where this client is an admin
    statement = select(PlanInstance).where(
        PlanInstance.client_group_id.in_(
            select(ClientGroup.id).join(Client, ClientGroup.admins).where(Client.id == client.id)
        )
    )
    
    if active_only:
        statement = statement.where(PlanInstance.is_active == True)
    
    statement = statement.offset(skip).limit(limit)
    plan_instances = session.exec(statement).all()
    return plan_instances

@router.get("/plan-instances/{instance_id}", response_model=PlanInstancePublic)
async def get_plan_instance(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    instance_id: uuid.UUID
) -> Any:
    """Get a specific plan instance"""
    # Get the client associated with the current user
    client = session.exec(
        select(Client).where(Client.user_id == current_user.id)
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found for current user")
    
    # Get the plan instance and verify access
    plan_instance = session.exec(
        select(PlanInstance)
        .where(PlanInstance.id == instance_id)
        .where(PlanInstance.client_group_id.in_(
            select(ClientGroup.id).join(Client, ClientGroup.admins).where(Client.id == client.id)
        ))
    ).first()
    
    if not plan_instance:
        raise HTTPException(
            status_code=404, 
            detail="Plan instance not found or you don't have access to it"
        )
    
    return plan_instance

@router.get("/plan-instances/{instance_id}/visits", response_model=List[Visit])
async def get_plan_instance_visits(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    instance_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all visits for a specific plan instance"""
    # Get the client associated with the current user
    client = session.exec(
        select(Client).where(Client.user_id == current_user.id)
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found for current user")
    
    # Verify access to the plan instance
    plan_instance = session.exec(
        select(PlanInstance)
        .where(PlanInstance.id == instance_id)
        .where(PlanInstance.client_group_id.in_(
            select(ClientGroup.id).join(Client, ClientGroup.admins).where(Client.id == client.id)
        ))
    ).first()
    
    if not plan_instance:
        raise HTTPException(
            status_code=404, 
            detail="Plan instance not found or you don't have access to it"
        )
    
    # Get visits for this plan instance
    statement = select(Visit).where(Visit.plan_instance_id == instance_id).offset(skip).limit(limit)
    visits = session.exec(statement).all()
    return visits

@router.get("/plan-instances/{instance_id}/payments", response_model=List[Payment])
async def get_plan_instance_payments(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    instance_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all payments for a specific plan instance"""
    # Get the client associated with the current user
    client = session.exec(
        select(Client).where(Client.user_id == current_user.id)
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found for current user")
    
    # Verify access to the plan instance
    plan_instance = session.exec(
        select(PlanInstance)
        .where(PlanInstance.id == instance_id)
        .where(PlanInstance.client_group_id.in_(
            select(ClientGroup.id).join(Client, ClientGroup.admins).where(Client.id == client.id)
        ))
    ).first()
    
    if not plan_instance:
        raise HTTPException(
            status_code=404, 
            detail="Plan instance not found or you don't have access to it"
        )
    
    # Get payments for this plan instance
    statement = select(Payment).where(Payment.plan_instance_id == instance_id).offset(skip).limit(limit)
    payments = session.exec(statement).all()
    return payments

@router.post("/payments", response_model=dict)
async def make_payment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payment_data: dict
) -> Any:
    """Make a payment for a plan instance"""
    plan_instance_id = payment_data.get("plan_instance_id")
    amount = payment_data.get("amount")
    payment_method = payment_data.get("payment_method", "credit_card")
    
    if not plan_instance_id or not amount:
        raise HTTPException(status_code=422, detail="Missing required fields")
    
    # Get the client associated with the current user
    client = session.exec(
        select(Client).where(Client.user_id == current_user.id)
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found for current user")
    
    # Verify access to the plan instance
    plan_instance = session.exec(
        select(PlanInstance)
        .where(PlanInstance.id == plan_instance_id)
        .where(PlanInstance.client_group_id.in_(
            select(ClientGroup.id).join(Client, ClientGroup.admins).where(Client.id == client.id)
        ))
    ).first()
    
    if not plan_instance:
        raise HTTPException(
            status_code=404, 
            detail="Plan instance not found or you don't have access to it"
        )
    
    # Create payment record
    payment = Payment(
        client_group_id=plan_instance.client_group_id,
        amount=amount,
        status="pending",
        payment_method=payment_method,
        transaction_id=str(uuid.uuid4()),  # Generate a transaction ID
        plan_id=plan_instance.plan_id,
        plan_instance_id=plan_instance_id
    )
    
    session.add(payment)
    session.commit()
    session.refresh(payment)
    
    result = {"id": payment.id}
    
    # If payment method is credit card, generate payment URL
    if payment_method == "credit_card":
        payment_url = generate_payment_url(
            payment_id=payment.id,
            amount=amount,
            description=f"Payment for plan instance",
            client_name=client.full_name,
            client_email=client.email
        )
        result["payment_url"] = payment_url
    
    return result