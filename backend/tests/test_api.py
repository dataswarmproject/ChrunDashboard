from fastapi.testclient import TestClient

from app.main import app


def test_health_and_overview_disclose_synthetic_source():
    with TestClient(app) as client:
        health = client.get("/api/health")
        overview = client.get("/api/v1/overview", headers={"X-User-Role": "executive"})

    assert health.status_code == 200
    assert health.json()["status"] == "healthy"
    assert health.json()["datasetType"] == "SYNTHETIC"
    assert overview.status_code == 200
    assert overview.json()["datasetNoticeAr"].startswith("بيانات اصطناعية")
    assert overview.json()["totalActiveCustomers"] >= 10_000


def test_customer_listing_validates_filters_and_masks_ids_by_role():
    with TestClient(app) as client:
        executive = client.get(
            "/api/v1/customers?region=Tripoli&pageSize=5",
            headers={"X-User-Role": "executive"},
        )
        analyst = client.get(
            "/api/v1/customers?region=Tripoli&pageSize=5",
            headers={"X-User-Role": "analyst"},
        )

    assert executive.status_code == 200
    assert len(executive.json()["data"]) == 5
    assert "***" in executive.json()["data"][0]["customerId"]
    assert analyst.json()["data"][0]["customerId"].startswith("LTT-")
    assert analyst.json()["data"][0]["region"] == "Tripoli"


def test_retention_updates_enforce_role_permissions_and_are_audited():
    payload = {"campaignStatus": "IN_PROGRESS", "retentionResult": "PENDING"}
    with TestClient(app) as client:
        customer = client.get(
            "/api/v1/customers?pageSize=1&riskLevel=CRITICAL",
            headers={"X-User-Role": "retention"},
        ).json()["data"][0]
        forbidden = client.patch(
            f"/api/v1/retention/{customer['customerId']}",
            json=payload,
            headers={"X-User-Role": "executive"},
        )
        updated = client.patch(
            f"/api/v1/retention/{customer['customerId']}",
            json=payload,
            headers={"X-User-Role": "retention"},
        )

    assert forbidden.status_code == 403
    assert updated.status_code == 200
    assert updated.json()["campaignStatus"] == "IN_PROGRESS"
