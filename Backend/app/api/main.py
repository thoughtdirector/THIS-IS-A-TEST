from fastapi import APIRouter

from app.api.routes import (
    login,
    users,
    client_management,
    visits,
    services,
    bundles,
    orders,
    credits,
    locations,
    zones,
    dashboard,
    admin
)

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(client_management.router, prefix="/clients", tags=["clients"])
api_router.include_router(visits.router, prefix="/visits", tags=["visits"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(bundles.router, prefix="/bundles", tags=["bundles"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(credits.router, prefix="/credits", tags=["credits"])
api_router.include_router(locations.router, prefix="/locations", tags=["locations"])
api_router.include_router(zones.router, prefix="/zones", tags=["zones"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])