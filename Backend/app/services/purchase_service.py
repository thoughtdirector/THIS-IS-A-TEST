from sqlmodel import Session
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.credit import Credit
from app.schemas.purchase import PlayTimePurchaseRequest, PlayTimePurchaseResponse

def purchase_play_time(data: PlayTimePurchaseRequest, db: Session) -> PlayTimePurchaseResponse:

    order = Order(
        user_id=data.parent_id,
        location_id=data.location_id,
        subtotal=data.price,
        tax=data.tax,
        total=data.price + data.tax,
        payment_method=data.payment_method,
        payment_status="completed"
    )
    db.add(order)
    db.commit()
    db.refresh(order)


    item = OrderItem(
        order_id=order.order_id,
        item_type="play_time",
        item_id=0,
        quantity=1,
        unit_price=data.price,
        total_price=data.price,
        minutes_credited=data.minutes,
        expiry_date=data.expiry_date
    )
    db.add(item)
    db.commit()


    credit = Credit(
        parent_id=data.parent_id,
        location_id=data.location_id,
        minutes_remaining=data.minutes,
        expiry_date=data.expiry_date
    )
    db.add(credit)
    db.commit()
    db.refresh(credit)

    return PlayTimePurchaseResponse(
        order_id=order.order_id,
        credit_id=credit.credit_id,
        total_minutes=credit.minutes_remaining
    )
