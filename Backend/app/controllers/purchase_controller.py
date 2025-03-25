from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from app.db.database import get_session
from app.schemas.purchase import PlayTimePurchaseRequest, PlayTimePurchaseResponse
from app.services.purchase_service import purchase_play_time

purchase_controller = APIRouter(prefix="/purchase", tags=["Purchase"])

@purchase_controller.post("/play-time", response_model=PlayTimePurchaseResponse, status_code=status.HTTP_201_CREATED)
def purchase_play_time_route(data: PlayTimePurchaseRequest, db: Session = Depends(get_session)):
    return purchase_play_time(data, db)
