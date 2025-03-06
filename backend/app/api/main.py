
from fastapi import APIRouter

from app.api.routes import items, login, users, utils, admin, clients, reservations

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(utils.router, prefix="/utils", tags=["utils"])
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
#api_router.include_router(reservations.router, prefix="/reservations", tags=["reservations"])