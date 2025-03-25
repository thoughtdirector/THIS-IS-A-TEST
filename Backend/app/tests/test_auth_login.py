import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel import SQLModel, Session
from app.models.user import User
from app.core.security import get_password_hash
from app.db.database import engine
from app.main import app

pytestmark = pytest.mark.anyio("asyncio")

@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(User(
            email="test@example.com",
            fullname="Test User",
            role_id=4,
            hash_password=get_password_hash("password123"),
            document_type="CC",
            document_number="123",
            terms_accepted=True
        ))
        session.commit()
    yield
    SQLModel.metadata.drop_all(engine)

async def test_login_success():
    transport = ASGITransport(app=app, raise_app_exceptions=True)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
    assert res.status_code == 200
    assert "access_token" in res.json()

async def test_login_failure():
    transport = ASGITransport(app=app, raise_app_exceptions=True)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpass"
        })
    assert res.status_code == 401
