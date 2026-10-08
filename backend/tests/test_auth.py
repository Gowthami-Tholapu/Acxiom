from datetime import datetime, timedelta, timezone
from app.models.user import User


def test_registration_success(client, db_session):
    resp = client.post(
        "/api/auth/register",
        json={"name": "New Executive", "email": "new.exec@crm.com", "password": "SecurePassword123!"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "new.exec@crm.com"
    # Default role must be SalesExecutive
    assert data["user"]["role"]["name"] == "SalesExecutive"
    # Password hash must not be present
    assert "password_hash" not in data["user"]


def test_registration_duplicate_email(client, seed_users):
    resp = client.post(
        "/api/auth/register",
        json={"name": "Duplicate", "email": "sales1@acxiom.com", "password": "SecurePassword123!"},
    )
    assert resp.status_code == 409


def test_registration_weak_password(client):
    # Missing special character
    resp = client.post(
        "/api/auth/register",
        json={"name": "Weak", "email": "weak@crm.com", "password": "Password123"},
    )
    assert resp.status_code == 400
    assert "special character" in resp.json()["detail"].lower()


def test_login_success(client, seed_users):
    resp = client.post(
        "/api/auth/login",
        json={"email": "sales1@acxiom.com", "password": "SalesPass123!"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["user"]["name"] == "Sales One"


def test_login_invalid_password(client, seed_users):
    resp = client.post(
        "/api/auth/login",
        json={"email": "sales1@acxiom.com", "password": "WrongPassword123!"},
    )
    assert resp.status_code == 401


def test_login_lockout_after_repeated_failures(client, db_session, seed_users):
    email = "sales2@acxiom.com"
    # 5 failed attempts
    for _ in range(5):
        resp = client.post(
            "/api/auth/login",
            json={"email": email, "password": "WrongPassword!"},
        )
        assert resp.status_code == 401

    # 6th attempt should be locked out (403)
    resp6 = client.post(
        "/api/auth/login",
        json={"email": email, "password": "WrongPassword!"},
    )
    assert resp6.status_code == 403
    assert "locked" in resp6.json()["detail"].lower()


def test_login_deactivated_account(client, db_session, seed_users):
    u = seed_users["sales1"]
    u.is_active = False
    db_session.add(u)
    db_session.commit()

    resp = client.post(
        "/api/auth/login",
        json={"email": u.email, "password": "SalesPass123!"},
    )
    assert resp.status_code == 403
    assert "deactivated" in resp.json()["detail"].lower()


def test_get_me_endpoint(client, seed_users):
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "test_admin@acxiom.com", "password": "AdminPass123!"},
    )
    token = login_resp.json()["access_token"]
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "test_admin@acxiom.com"
    assert resp.json()["role"]["name"] == "Admin"
