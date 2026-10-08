from datetime import date, datetime, timedelta
from tests.conftest import get_auth_token


def test_customer_validation_and_uniqueness(client, seed_users):
    admin_token = get_auth_token(client, "test_admin@acxiom.com", "AdminPass123!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Valid customer
    valid_data = {
        "customer_name": "Test Enterprise",
        "email": "test@enterprise.com",
        "phone": "+1-555-019-2834",
        "company_name": "Test Co",
        "status": "Active",
    }
    resp = client.post("/api/customers", json=valid_data, headers=headers)
    assert resp.status_code == 201
    cust_id = resp.json()["id"]
    assert resp.json()["customer_code"].startswith("CUST-")

    # Invalid email format
    resp_bad_email = client.post(
        "/api/customers",
        json={**valid_data, "email": "invalid-email-format", "phone": "+1-555-019-9999"},
        headers=headers,
    )
    assert resp_bad_email.status_code in [400, 422]

    # Invalid phone format
    resp_bad_phone = client.post(
        "/api/customers",
        json={**valid_data, "email": "different@enterprise.com", "phone": "123"},
        headers=headers,
    )
    assert resp_bad_phone.status_code in [400, 422]

    # Duplicate email
    resp_dup_email = client.post(
        "/api/customers",
        json={**valid_data, "customer_name": "Other Corp", "phone": "+1-555-019-8888"},
        headers=headers,
    )
    assert resp_dup_email.status_code == 409


def test_sales_executive_scoping_and_forbidden_access(client, seed_users):
    sales1_token = get_auth_token(client, "sales1@acxiom.com", "SalesPass123!")
    sales2_token = get_auth_token(client, "sales2@acxiom.com", "SalesPass123!")
    headers1 = {"Authorization": f"Bearer {sales1_token}"}
    headers2 = {"Authorization": f"Bearer {sales2_token}"}

    # Sales 1 creates customer
    resp1 = client.post(
        "/api/customers",
        json={
            "customer_name": "Sales 1 Exclusive Client",
            "email": "s1_client@exclusive.com",
            "phone": "+1-555-018-1111",
            "company_name": "S1 Holdings",
            "status": "Active",
        },
        headers=headers1,
    )
    assert resp1.status_code == 201
    cust_id = resp1.json()["id"]

    # Sales 1 can access
    get_resp1 = client.get(f"/api/customers/{cust_id}", headers=headers1)
    assert get_resp1.status_code == 200

    # Sales 2 CANNOT access Sales 1's customer -> Must be 403 Forbidden!
    get_resp2 = client.get(f"/api/customers/{cust_id}", headers=headers2)
    assert get_resp2.status_code == 403


def test_opportunity_business_rules(client, seed_users):
    admin_token = get_auth_token(client, "test_admin@acxiom.com", "AdminPass123!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create customer for opportunity
    c_resp = client.post(
        "/api/customers",
        json={
            "customer_name": "Deal Target Inc",
            "email": "deal@target.com",
            "phone": "+1-555-014-9988",
            "company_name": "Deal Target",
            "status": "Active",
        },
        headers=headers,
    )
    cust_id = c_resp.json()["id"]
    future_date = str(date.today() + timedelta(days=30))
    past_date = str(date.today() - timedelta(days=5))

    # Rule 1: Amount <= 0 rejected
    resp_bad_amt = client.post(
        "/api/opportunities",
        json={
            "opportunity_name": "Zero Deal",
            "customer_id": cust_id,
            "amount": 0,
            "stage": "Proposal",
            "probability": 50,
            "expected_close_date": future_date,
        },
        headers=headers,
    )
    assert resp_bad_amt.status_code == 400

    # Rule 2: Probability > 100 rejected
    resp_bad_prob = client.post(
        "/api/opportunities",
        json={
            "opportunity_name": "High Prob Deal",
            "customer_id": cust_id,
            "amount": 50000,
            "stage": "Proposal",
            "probability": 105,
            "expected_close_date": future_date,
        },
        headers=headers,
    )
    assert resp_bad_prob.status_code in [400, 422]

    # Rule 3: Past close date rejected for active opportunity
    resp_past_date = client.post(
        "/api/opportunities",
        json={
            "opportunity_name": "Past Close Deal",
            "customer_id": cust_id,
            "amount": 50000,
            "stage": "Proposal",
            "probability": 50,
            "expected_close_date": past_date,
        },
        headers=headers,
    )
    assert resp_past_date.status_code == 400
    assert "cannot be in the past" in resp_past_date.json()["detail"].lower()

    # Valid creation & weighted value calculation
    resp_valid = client.post(
        "/api/opportunities",
        json={
            "opportunity_name": "Big Enterprise Expansion",
            "customer_id": cust_id,
            "amount": 100000,
            "stage": "Proposal",
            "probability": 40,
            "expected_close_date": future_date,
        },
        headers=headers,
    )
    assert resp_valid.status_code == 201
    opp_data = resp_valid.json()
    assert opp_data["weighted_value"] == 40000.0


def test_follow_up_date_rules(client, seed_users):
    admin_token = get_auth_token(client, "test_admin@acxiom.com", "AdminPass123!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    past_dt = (datetime.now() - timedelta(days=2)).isoformat()
    future_dt = (datetime.now() + timedelta(days=2)).isoformat()

    # Rule: Follow-up date cannot be earlier than today for a new/planned follow-up
    resp_past = client.post(
        "/api/followups",
        json={
            "subject": "Past planned meeting",
            "follow_up_date": past_dt,
            "follow_up_type": "Call",
            "status": "Planned",
        },
        headers=headers,
    )
    assert resp_past.status_code == 400
    assert "earlier than today" in resp_past.json()["detail"].lower()

    # Future date succeeds
    resp_future = client.post(
        "/api/followups",
        json={
            "subject": "Future strategy review",
            "follow_up_date": future_dt,
            "follow_up_type": "Meeting",
            "status": "Planned",
        },
        headers=headers,
    )
    assert resp_future.status_code == 201


def test_lead_conversion_workflow(client, seed_users):
    admin_token = get_auth_token(client, "test_admin@acxiom.com", "AdminPass123!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create Lead
    l_resp = client.post(
        "/api/leads",
        json={
            "lead_name": "Jennifer Sterling",
            "email": "jennifer@sterlingholdings.com",
            "phone": "+1-555-013-4455",
            "company_name": "Sterling Holdings",
            "source": "Website",
            "status": "New",
            "priority": "High",
            "expected_value": 75000.0,
        },
        headers=headers,
    )
    assert l_resp.status_code == 201
    lead_id = l_resp.json()["id"]

    # 2. Transition status: New -> Contacted -> Qualified
    put_resp1 = client.put(f"/api/leads/{lead_id}", json={"status": "Contacted"}, headers=headers)
    assert put_resp1.status_code == 200

    put_resp2 = client.put(f"/api/leads/{lead_id}", json={"status": "Qualified"}, headers=headers)
    assert put_resp2.status_code == 200

    # 3. Convert Qualified Lead to Customer & Opportunity
    conv_resp = client.post(
        f"/api/leads/{lead_id}/convert",
        json={
            "create_opportunity": True,
            "opportunity_name": "Sterling Cloud Transformation",
            "opportunity_amount": 75000.0,
        },
        headers=headers,
    )
    assert conv_resp.status_code == 200
    data = conv_resp.json()
    assert data["customer"]["customer_name"] == "Jennifer Sterling"
    assert data["opportunity"]["opportunity_name"] == "Sterling Cloud Transformation"

    # 4. Attempt duplicate conversion -> must be rejected
    dup_conv = client.post(
        f"/api/leads/{lead_id}/convert",
        json={"create_opportunity": False},
        headers=headers,
    )
    assert dup_conv.status_code == 400
    assert "already been converted" in dup_conv.json()["detail"].lower()


def test_audit_logs_recorded(client, seed_users):
    admin_token = get_auth_token(client, "test_admin@acxiom.com", "AdminPass123!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.get("/api/audit-logs", headers=headers)
    assert resp.status_code == 200
    logs = resp.json()["items"]
    assert len(logs) > 0
    # Non-admin cannot view audit logs
    sales_token = get_auth_token(client, "sales1@acxiom.com", "SalesPass123!")
    resp_forbidden = client.get("/api/audit-logs", headers={"Authorization": f"Bearer {sales_token}"})
    assert resp_forbidden.status_code == 403
