import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.role import Role
from app.models.user import User
from app.core.security import get_password_hash

TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    # Seed roles
    for r_name in ["Admin", "Manager", "SalesExecutive"]:
        if not db.query(Role).filter_by(name=r_name).first():
            db.add(Role(name=r_name))
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def seed_users(db_session):
    admin_role = db_session.query(Role).filter_by(name="Admin").first()
    manager_role = db_session.query(Role).filter_by(name="Manager").first()
    sales_role = db_session.query(Role).filter_by(name="SalesExecutive").first()

    admin = User(
        name="Admin Test",
        email="test_admin@acxiom.com",
        password_hash=get_password_hash("AdminPass123!"),
        role_id=admin_role.id,
        is_active=True,
    )
    manager = User(
        name="Manager Test",
        email="test_manager@acxiom.com",
        password_hash=get_password_hash("ManagerPass123!"),
        role_id=manager_role.id,
        is_active=True,
    )
    sales1 = User(
        name="Sales One",
        email="sales1@acxiom.com",
        password_hash=get_password_hash("SalesPass123!"),
        role_id=sales_role.id,
        is_active=True,
    )
    sales2 = User(
        name="Sales Two",
        email="sales2@acxiom.com",
        password_hash=get_password_hash("SalesPass123!"),
        role_id=sales_role.id,
        is_active=True,
    )

    db_session.add_all([admin, manager, sales1, sales2])
    db_session.commit()
    return {"admin": admin, "manager": manager, "sales1": sales1, "sales2": sales2}


def get_auth_token(client, email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]
