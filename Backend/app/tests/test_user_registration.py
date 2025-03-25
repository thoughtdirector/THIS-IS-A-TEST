import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel import SQLModel, Session
from app.db.database import engine
from app.models.user import User
from app.core.security import get_password_hash
from app.main import app

pytestmark = pytest.mark.anyio("asyncio")

@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)

async def test_register_user_success():
    transport = ASGITransport(app=app, raise_app_exceptions=True)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/users/", json={
            "role_id": 4,
            "email": "parent@example.com",
            "fullname": "Parent Test",
            "password": "SecurePass123",
            "document_type": "CC",
            "document_number": "123456789",
            "terms_accepted": True
        })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "parent@example.com"

async def test_register_user_conflict():
    with Session(engine) as session:
        session.add(User(
            email="exists@example.com",
            role_id=4,
            fullname="Test",
            hash_password=get_password_hash("dummy"),
            document_type="CC",
            document_number="1",
            terms_accepted=True
        ))
        session.commit()

    transport = ASGITransport(app=app, raise_app_exceptions=True)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/users/", json={
            "role_id": 4,
            "email": "exists@example.com",
            "fullname": "Duplicate",
            "password": "SecurePass123",
            "document_type": "CC",
            "document_number": "123456789",
            "terms_accepted": True
        })
    assert response.status_code == 409
import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel import SQLModel, Session
from app.db.database import engine
from app.models.user import User
from app.core.security import get_password_hash
from app.main import app

@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)

async def test_register_user_success():
    transport = ASGITransport(app=app, raise_app_exceptions=True)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/users/", json={
            "role_id": 4,
            "email": "parent@example.com",
            "fullname": "Parent Test",
            "password": "SecurePass123",
            "document_type": "CC",
            "document_number": "123456789",
            "terms_accepted": True
        })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "parent@example.com"

async def test_register_user_conflict():
    with Session(engine) as session:
        session.add(User(
            email="exists@example.com",
            role_id=4,
            fullname="Test",
            hash_password=get_password_hash("dummy"),
            document_type="CC",
            document_number="1",
            terms_accepted=True
        ))
        session.commit()

    transport = ASGITransport(app=app, raise_app_exceptions=True)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/users/", json={
            "role_id": 4,
            "email": "exists@example.com",
            "fullname": "Duplicate",
            "password": "SecurePass123",
            "document_type": "CC",
            "document_number": "123456789",
            "terms_accepted": True
        })
    assert response.status_code == 409
