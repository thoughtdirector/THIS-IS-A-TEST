from fastapi import APIRouter
from app.controllers.user_controller import user_controller
from app.controllers.auth_controller import auth_controller
from app.controllers.child_controller import child_controller
from app.controllers.purchase_controller import purchase_controller


api_router = APIRouter()
api_router.include_router(auth_controller)
api_router.include_router(user_controller)
api_router.include_router(child_controller)
api_router.include_router(purchase_controller)


@api_router.get("/health-check")
async def health_check():
    return {"status": "OK"}

