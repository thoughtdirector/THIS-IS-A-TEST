from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import select, func
from typing import Any, Optional, List
from datetime import datetime, date
from app.api.deps import CurrentUser, SessionDep, GetAdminUser
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.credit import Credit
from app.models.user import User
from app.models.service import Service
from app.models.bundle import Bundle
from app.models.location import Location
from app.services.epayco import generate_payment_url

router = APIRouter()

# Parent routes for orders
@router.post("/create", response_model=dict)
def create_order(
    *, session: SessionDep, current_user: CurrentUser, order_data: dict
) -> Any:
    """Create a new order with items"""
    location_id = order_data.get("location_id")
    
    # Validate location
    location = session.get(Location, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Create order
    subtotal = order_data.get("subtotal", 0)
    tax = order_data.get("tax", 0)
    total = subtotal + tax
    
    new_order = Order(
        user_id=current_user.user_id,
        location_id=location_id,
        subtotal=subtotal,
        tax=tax,
        total=total,
        payment_status="pending",
        payment_method=order_data.get("payment_method", "credit_card")
    )
    
    session.add(new_order)
    session.commit()
    session.refresh(new_order)
    
    # Process order items
    items = order_data.get("items", [])
    order_items = []
    
    for item in items:
        item_type = item.get("item_type")
        item_id = item.get("item_id")
        quantity = item.get("quantity", 1)
        
        # Validate item exists and get price
        if item_type == "service":
            db_item = session.get(Service, item_id)
            if not db_item:
                continue  # Skip invalid items
            unit_price = db_item.price
            
        elif item_type == "bundle":
            db_item = session.get(Bundle, item_id)
            if not db_item:
                continue  # Skip invalid items
            unit_price = db_item.price
            
        elif item_type == "play_time":
            # Play time is charged by minutes
            minutes = item.get("minutes", 60)  # Default to 1 hour
            unit_price = item.get("unit_price", 1)  # Price per minute
            quantity = 1  # Only one credit entry
            
        else:
            continue  # Skip unknown item types
        
        # Calculate total for this item
        total_price = unit_price * quantity
        
        # Create order item
        new_item = OrderItem(
            order_id=new_order.order_id,
            item_type=item_type,
            item_id=item_id,
            quantity=quantity,
            unit_price=unit_price,
            total_price=total_price
        )
        
        # Add play time specific fields
        if item_type == "play_time":
            new_item.minutes_credited = item.get("minutes")
            
            # Set expiry date if provided
            expiry_days = item.get("expiry_days")
            if expiry_days:
                new_item.expiry_date = datetime.utcnow().date() + timedelta(days=expiry_days)
        
        session.add(new_item)
        order_items.append(new_item)
    
    session.commit()
    
    # Generate payment URL if credit card payment
    payment_url = None
    if new_order.payment_method == "credit_card":
        # Get client info for payment
        payment_url = generate_payment_url(
            payment_id=new_order.order_id,
            amount=new_order.total,
            description=f"Order #{new_order.order_id} - {len(order_items)} items",
            client_name=current_user.fullname,
            client_email=current_user.email
        )
    
    return {
        "order_id": new_order.order_id,
        "total": new_order.total,
        "payment_status": new_order.payment_status,
        "items_count": len(order_items),
        "payment_url": payment_url
    }

@router.get("/my-orders", response_model=List[dict])
def get_my_orders(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all orders for the current user"""
    orders = session.exec(
        select(Order)
        .where(Order.user_id == current_user.user_id)
        .order_by(Order.order_date.desc())
        .offset(skip)
        .limit(limit)
    ).all()
    
    result = []
    for order in orders:
        # Get order items
        items = session.exec(
            select(OrderItem).where(OrderItem.order_id == order.order_id)
        ).all()
        
        # Get location info
        location = session.get(Location, order.location_id)
        
        order_data = {
            "order_id": order.order_id,
            "order_date": order.order_date,
            "subtotal": order.subtotal,
            "tax": order.tax,
            "total": order.total,
            "payment_status": order.payment_status,
            "payment_method": order.payment_method,
            "location_name": location.name if location else "Unknown",
            "items_count": len(items),
            "items": [
                {
                    "item_type": item.item_type,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                    "minutes_credited": item.minutes_credited
                }
                for item in items
            ]
        }
        result.append(order_data)
    
    return result

@router.get("/order/{order_id}", response_model=dict)
def get_order_details(
    *, session: SessionDep, current_user: CurrentUser, order_id: int
) -> Any:
    """Get detailed information about an order"""
    # Get order and verify ownership
    order = session.get(Order, order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user owns this order or is admin
    admin_user = hasattr(current_user, "is_superuser") and current_user.is_superuser
    
    if order.user_id != current_user.user_id and not admin_user:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    
    # Get order items
    items = session.exec(
        select(OrderItem).where(OrderItem.order_id == order_id)
    ).all()
    
    item_details = []
    for item in items:
        # Get detailed info based on item type
        detail = {
            "item_id": item.item_id,
            "item_type": item.item_type,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item.total_price,
            "minutes_credited": item.minutes_credited,
            "expiry_date": item.expiry_date
        }
        
        # Add name based on item type
        if item.item_type == "service":
            service = session.get(Service, item.item_id)
            if service:
                detail["name"] = service.name
                detail["service_type"] = service.service_type
        
        elif item.item_type == "bundle":
            bundle = session.get(Bundle, item.item_id)
            if bundle:
                detail["name"] = bundle.name
                detail["is_subscription"] = bundle.is_subscription
        
        elif item.item_type == "play_time":
            detail["name"] = f"Play Time Credit ({item.minutes_credited} minutes)"
        
        item_details.append(detail)
    
    # Get location info
    location = session.get(Location, order.location_id)
    
    return {
        "order_id": order.order_id,
        "order_date": order.order_date,
        "user_id": order.user_id,
        "location": {
            "location_id": location.location_id,
            "name": location.name,
            "address": location.address,
            "city": location.city
        } if location else None,
        "subtotal": order.subtotal,
        "tax": order.tax,
        "total": order.total,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "transaction_id": order.transaction_id,
        "items": item_details
    }

@router.post("/process-payment", response_model=dict)
def process_payment_callback(
    *, session: SessionDep, payment_data: dict
) -> Any:
    """Process payment callback from payment gateway"""
    order_id = payment_data.get("order_id")
    status = payment_data.get("status")
    transaction_id = payment_data.get("transaction_id")
    
    if not order_id or not status:
        raise HTTPException(status_code=400, detail="Invalid payment data")
    
    # Get the order
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update order payment status
    order.payment_status = status
    order.transaction_id = transaction_id
    
    session.add(order)
    session.commit()
    
    # If payment successful, process credits and services
    if status == "completed":
        # Get order items
        items = session.exec(
            select(OrderItem).where(OrderItem.order_id == order_id)
        ).all()
        
        for item in items:
            # Process play time credits
            if item.item_type == "play_time" and item.minutes_credited:
                # Check if user already has a credit for this location
                user = session.exec(
                    select(User).join(Order).where(Order.order_id == order_id)
                ).first()
                
                if not user:
                    continue
                
                # Find existing credit or create new one
                credit = session.exec(
                    select(Credit)
                    .where(Credit.parent_id == user.user_id)
                    .where(Credit.location_id == order.location_id)
                ).first()
                
                if credit:
                    # Add minutes to existing credit
                    credit.minutes_remaining += item.minutes_credited
                    
                    # Update expiry date if provided
                    if item.expiry_date and (not credit.expiry_date or item.expiry_date > credit.expiry_date):
                        credit.expiry_date = item.expiry_date
                else:
                    # Create new credit
                    credit = Credit(
                        parent_id=user.user_id,
                        location_id=order.location_id,
                        minutes_remaining=item.minutes_credited,
                        expiry_date=item.expiry_date
                    )
                
                session.add(credit)
        
        session.commit()
    
    return {
        "order_id": order.order_id,
        "payment_status": order.payment_status,
        "message": f"Payment {status}"
    }

# Admin routes for order management 
@router.get("/admin/orders", response_model=List[dict])
def get_all_orders(
    session: SessionDep,
    current_user: GetAdminUser,
    location_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get all orders with filtering (admin only)"""
    query = select(Order)
    
    if location_id:
        query = query.where(Order.location_id == location_id)
    
    if status:
        query = query.where(Order.payment_status == status)
    
    if start_date:
        query = query.where(Order.order_date >= start_date)
    
    if end_date:
        query = query.where(Order.order_date <= end_date)
    
    query = query.order_by(Order.order_date.desc()).offset(skip).limit(limit)
    orders = session.exec(query).all()
    
    result = []
    for order in orders:
        # Get user info
        user = session.get(User, order.user_id)
        
        # Get order items count
        items_count = session.exec(
            select(func.count(OrderItem.order_item_id))
            .where(OrderItem.order_id == order.order_id)
        ).one()
        
        order_data = {
            "order_id": order.order_id,
            "order_date": order.order_date,
            "user": {
                "user_id": user.user_id,
                "fullname": user.fullname,
                "email": user.email
            } if user else None,
            "location_id": order.location_id,
            "total": order.total,
            "payment_status": order.payment_status,
            "payment_method": order.payment_method,
            "items_count": items_count
        }
        result.append(order_data)
    
    return result

@router.put("/admin/orders/{order_id}", response_model=dict)
def update_order_status(
    *, session: SessionDep, current_user: GetAdminUser, order_id: int, order_data: dict
) -> Any:
    """Update order payment status (admin only)"""
    order = session.get(Order, order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update payment status
    if "payment_status" in order_data:
        order.payment_status = order_data["payment_status"]
    
    if "transaction_id" in order_data:
        order.transaction_id = order_data["transaction_id"]
    
    if "payment_method" in order_data:
        order.payment_method = order_data["payment_method"]
    
    session.add(order)
    session.commit()
    session.refresh(order)
    
    # If payment was completed, process credits for play time
    if order.payment_status == "completed":
        # Get order items
        items = session.exec(
            select(OrderItem).where(OrderItem.order_id == order_id)
        ).all()
        
        for item in items:
            # Process play time credits
            if item.item_type == "play_time" and item.minutes_credited:
                # Find existing credit or create new one
                credit = session.exec(
                    select(Credit)
                    .where(Credit.parent_id == order.user_id)
                    .where(Credit.location_id == order.location_id)
                ).first()
                
                if credit:
                    # Add minutes to existing credit
                    credit.minutes_remaining += item.minutes_credited
                    
                    # Update expiry date if provided
                    if item.expiry_date and (not credit.expiry_date or item.expiry_date > credit.expiry_date):
                        credit.expiry_date = item.expiry_date
                else:
                    # Create new credit
                    credit = Credit(
                        parent_id=order.user_id,
                        location_id=order.location_id,
                        minutes_remaining=item.minutes_credited,
                        expiry_date=item.expiry_date
                    )
                
                session.add(credit)
        
        session.commit()
    
    return {
        "order_id": order.order_id,
        "payment_status": order.payment_status,
        "message": "Order updated successfully"
    }

@router.get("/credits", response_model=List[dict])
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
        .where(Credit.minutes_remaining > 0)
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
        
        credit_data = {
            "credit_id": credit.credit_id,
            "minutes_remaining": credit.minutes_remaining,
            "hours_remaining": round(credit.minutes_remaining / 60, 2),
            "expiry_date": credit.expiry_date,
            "is_expired": is_expired,
            "location": {
                "location_id": location.location_id,
                "name": location.name
            } if location else None
        }
        result.append(credit_data)
    
    return result

@router.get("/admin/order-stats", response_model=dict)
def get_order_statistics(
    session: SessionDep,
    current_user: GetAdminUser,
    location_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Any:
    """Get order and revenue statistics (admin only)"""
    # Set default date range if not provided
    if not start_date:
        start_date = datetime.now().replace(day=1).date()  # First day of current month
    if not end_date:
        end_date = datetime.now().date()
    
    # Base query filters
    base_filters = []
    if location_id:
        base_filters.append(Order.location_id == location_id)
    
    base_filters.extend([
        Order.order_date >= start_date,
        Order.order_date <= end_date
    ])
    
    # Total orders
    total_orders = session.exec(
        select(func.count(Order.order_id))
        .where(*base_filters)
    ).one()
    
    # Total revenue (completed payments only)
    total_revenue = session.exec(
        select(func.sum(Order.total))
        .where(*base_filters)
        .where(Order.payment_status == "completed")
    ).one() or 0
    
    # Orders by payment status
    status_counts = session.exec(
        select(Order.payment_status, func.count(Order.order_id))
        .where(*base_filters)
        .group_by(Order.payment_status)
    ).all()
    
    status_data = {status: count for status, count in status_counts}
    
    # Orders by payment method
    method_counts = session.exec(
        select(Order.payment_method, func.count(Order.order_id))
        .where(*base_filters)
        .where(Order.payment_method != None)
        .group_by(Order.payment_method)
    ).all()
    
    method_data = {method: count for method, count in method_counts}
    
    # Items by type
    item_type_counts = session.exec(
        select(OrderItem.item_type, func.count(OrderItem.order_item_id))
        .join(Order)
        .where(*base_filters)
        .group_by(OrderItem.item_type)
    ).all()
    
    item_type_data = {item_type: count for item_type, count in item_type_counts}
    
    # Play time minutes sold
    play_time_minutes = session.exec(
        select(func.sum(OrderItem.minutes_credited))
        .join(Order)
        .where(*base_filters)
        .where(OrderItem.item_type == "play_time")
        .where(Order.payment_status == "completed")
    ).one() or 0
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "orders_by_status": status_data,
        "orders_by_payment_method": method_data,
        "items_by_type": item_type_data,
        "play_time_minutes_sold": play_time_minutes,
        "date_range": {
            "start_date": start_date,
            "end_date": end_date
        }
    }