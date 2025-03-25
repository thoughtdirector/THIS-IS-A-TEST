import pytest
from httpx import AsyncClient
from httpx import ASGITransport
from sqlmodel import Session
from datetime import datetime, timedelta
from app.main import app
from app.db.database import engine
from app.models.user import User
from app.models.location import Location
from app.core.security import get_password_hash

@pytest.fixture(autouse=True)
def setup_db():
    from app.models import user, child, location, service, order, order_item, credit
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)

@pytest.fixture
def test_location():
    with Session(engine) as session:
        location = Location(name="Test Location", address="123 Main St")
        session.add(location)
        session.commit()
        session.refresh(location)
        return location

@pytest.fixture
def test_user(test_location):
    with Session(engine) as session:
        user = User(
            role_id=4,
            location_id=test_location.location_id,
            email="test@example.com",
            fullname="Test User",
            phone="1234567890",
            hash_password=get_password_hash("testpassword"),
            document_type="ID",
            document_number="123456789",
            terms_accepted=True,
            is_active=True,
            created_at=datetime.utcnow()
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

@pytest.mark.anyio
async def test_purchase_play_time(test_user, test_location):
    payload = {
        "parent_id": test_user.user_id,
        "location_id": test_location.location_id,
        "minutes": 60,
        "price": 25.0,
        "tax": 4.75,
        "payment_method": "card",
        "expiry_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/purchase/play-time", json=payload)

    assert response.status_code == 201
    data = response.json()

    assert "order_id" in data
    assert "credit_id" in data
    assert data["total_minutes"] == 60
    assert data["status"] == "completed"
