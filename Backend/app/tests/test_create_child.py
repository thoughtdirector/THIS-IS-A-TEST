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
    with Session(engine) as session:
        session.add(User(
            user_id=1,
            role_id=4,
            fullname="Test Parent",
            email="parent@example.com",
            hash_password=get_password_hash("abc123"),
            document_type="CC",
            document_number="123456",
            terms_accepted=True
        ))
        session.commit()
    yield
    SQLModel.metadata.drop_all(engine)

async def test_create_child_success():
    transport = ASGITransport(app=app, raise_app_exceptions=True)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/children/", json={
            "parent_id": 1,
            "fullname": "Little Juan",
            "birth_date": "2019-05-01",
            "allergies": "Peanuts",
            "emergency_contact_name": "Maria Lopez",
            "emergency_contact_phone": "1234567890",
            "emergency_contact_relationship": "Mother",
            "special_notes": "Very active"
        })

    assert res.status_code == 201
    data = res.json()
    assert data["fullname"] == "Little Juan"
    assert data["parent_id"] == 1
