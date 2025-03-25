import pytest
import pytest
from sqlmodel import SQLModel
from app.db.database import engine
import app.db  

@pytest.fixture(autouse=True)
def setup_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
