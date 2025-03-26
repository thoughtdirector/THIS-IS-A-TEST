from fastapi import APIRouter
from app.api.routes import client_management, client_groups, client_plans

router = APIRouter()

# Include the sub-routers
router.include_router(client_management.router, prefix="/management", tags=["client-management"])
router.include_router(client_groups.router, prefix="/groups", tags=["client-groups"])
router.include_router(client_plans.router, prefix="/plans", tags=["client-plans"]) 