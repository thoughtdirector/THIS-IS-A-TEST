from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.api.routes import api_router
from app.core.config import settings
from app.db.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.include_router(api_router, prefix=settings.API_V1_STR)

