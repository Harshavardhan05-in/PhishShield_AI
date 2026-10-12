"""
PhishShield AI — Backend Tests
Run with: pytest tests/ -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ── Health endpoint ───────────────────────────────────────────────────────────

def test_health_returns_ok():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "ml_model_available" in data
    assert "rule_engine_available" in data
    assert data["rule_engine_available"] is True


def test_model_status_returns_structure():
    response = client.get("/api/v1/model-status")
    assert response.status_code == 200
    data = response.json()
    assert "available" in data
    assert "feature_count" in data
    assert isinstance(data["feature_count"], int)


# ── Scan endpoint — valid URLs ────────────────────────────────────────────────

def test_scan_valid_https_url():
    response = client.post("/api/v1/scan", json={"url": "https://www.google.com"})
    assert response.status_code == 200
    data = response.json()
    assert data["url"] != ""
    assert 0 <= data["risk_score"] <= 100
    assert data["risk_category"] in ("safe", "suspicious", "high_risk")
    assert isinstance(data["findings"], list)
    assert len(data["findings"]) > 0
    assert isinstance(data["reasons"], list)
    assert isinstance(data["recommended_actions"], list)
    assert "ml_result" in data
    assert "scan_id" in data


def test_scan_valid_http_url():
    response = client.post("/api/v1/scan", json={"url": "http://example.com"})
    assert response.status_code == 200
    data = response.json()
    assert 0 <= data["risk_score"] <= 100


def test_scan_url_without_scheme():
    """URL missing scheme should be accepted (auto-prefix applied)."""
    response = client.post("/api/v1/scan", json={"url": "example.com"})
    assert response.status_code == 200


def test_scan_suspicious_ip_url():
    response = client.post(
        "/api/v1/scan", json={"url": "http://192.168.1.1/login"}
    )
    assert response.status_code == 200
    data = response.json()
    # IP address rule should trigger
    triggered = [f for f in data["findings"] if f["rule_id"] == "R01" and f["triggered"]]
    assert len(triggered) == 1
    assert data["risk_score"] >= 25


def test_scan_phishing_like_url():
    url = "http://paypal-secure-login.xyz/account/verify?redirect=http://evil.com"
    response = client.post("/api/v1/scan", json={"url": url})
    assert response.status_code == 200
    data = response.json()
    # Should score as suspicious or high_risk
    assert data["risk_category"] in ("suspicious", "high_risk")
    assert data["risk_score"] > 30


def test_scan_at_symbol_url():
    url = "http://trusted-bank.com@evil.com/phishing"
    response = client.post("/api/v1/scan", json={"url": url})
    assert response.status_code == 200
    data = response.json()
    # R07 (@ symbol) should trigger
    r07 = [f for f in data["findings"] if f["rule_id"] == "R07"]
    assert r07[0]["triggered"] is True
    assert data["risk_score"] >= 40


# ── Scan endpoint — invalid inputs ───────────────────────────────────────────

def test_scan_empty_url():
    response = client.post("/api/v1/scan", json={"url": ""})
    assert response.status_code == 422


def test_scan_missing_url_field():
    response = client.post("/api/v1/scan", json={})
    assert response.status_code == 422


def test_scan_url_too_long():
    long_url = "https://example.com/" + "a" * 2100
    response = client.post("/api/v1/scan", json={"url": long_url})
    assert response.status_code == 422


# ── Risk score boundaries ─────────────────────────────────────────────────────

def test_risk_score_in_bounds():
    urls = [
        "https://www.google.com",
        "http://192.168.1.1@paypal-secure.xyz/login?redirect=http://evil.tk",
        "https://github.com/features",
        "http://free-prize.win/claim?user=you&token=abc&redirect=malware.ml",
    ]
    for url in urls:
        response = client.post("/api/v1/scan", json={"url": url})
        assert response.status_code == 200
        score = response.json()["risk_score"]
        assert 0 <= score <= 100, f"Score out of bounds for {url}: {score}"


# ── Deterministic rule outputs ────────────────────────────────────────────────

def test_rule_output_is_deterministic():
    url = "http://paypal.secure-login.xyz/verify"
    r1 = client.post("/api/v1/scan", json={"url": url}).json()
    r2 = client.post("/api/v1/scan", json={"url": url}).json()
    assert r1["risk_score"] == r2["risk_score"]
    assert r1["risk_category"] == r2["risk_category"]
    assert r1["ml_result"]["prediction"] == r2["ml_result"]["prediction"]


# ── Response structure completeness ──────────────────────────────────────────

def test_scan_response_has_all_required_fields():
    response = client.post("/api/v1/scan", json={"url": "https://example.com"})
    data = response.json()
    required_fields = [
        "url", "normalized_url", "risk_score", "risk_category",
        "ml_result", "findings", "triggered_findings", "reasons",
        "recommended_actions", "scan_id", "scanned_at",
        "analysis_method", "limitations",
    ]
    for field in required_fields:
        assert field in data, f"Missing field: {field}"


def test_findings_have_required_structure():
    response = client.post("/api/v1/scan", json={"url": "https://example.com"})
    findings = response.json()["findings"]
    assert len(findings) == 12
    for f in findings:
        assert "rule_id" in f
        assert "title" in f
        assert "severity" in f
        assert "triggered" in f
        assert "explanation" in f
        assert "score_contribution" in f


# ── Explainable Risk Report (Feature 1) ──────────────────────────────────────

def test_triggered_indicators_include_evidence_and_score_contribution():
    url = "http://192.168.1.1@paypal-secure.xyz/login/verify?redirect=http://evil.tk"
    response = client.post("/api/v1/scan", json={"url": url})
    assert response.status_code == 200
    data = response.json()

    triggered = data["triggered_findings"]
    assert len(triggered) >= 3
    for f in triggered:
        assert f["triggered"] is True
        assert f["score_contribution"] > 0
        # Every triggered finding must be reflected in reasons with its title and evidence
        matching_reasons = [r for r in data["reasons"] if f["title"] in r]
        assert len(matching_reasons) == 1
        if f.get("evidence"):
            clean_ev = f["evidence"].strip().rstrip(".")
            assert clean_ev in matching_reasons[0]
        assert ".." not in matching_reasons[0]


def test_untriggered_indicators_have_zero_score_and_remain_in_findings():
    response = client.post("/api/v1/scan", json={"url": "https://www.google.com"})
    assert response.status_code == 200
    data = response.json()

    assert len(data["triggered_findings"]) == 0
    assert len(data["findings"]) == 12
    for f in data["findings"]:
        assert f["triggered"] is False
        assert f["score_contribution"] == 0
    assert any("No significant phishing indicators" in r for r in data["reasons"])


def test_missing_evidence_and_unavailable_ml_handling():
    from app.services.scan_service import _build_reasons
    from app.schemas.scan import SecurityFinding, MLResult, RiskCategory

    finding_no_evidence = SecurityFinding(
        rule_id="R99",
        title="Test Rule Without Evidence",
        severity="medium",
        triggered=True,
        evidence=None,
        explanation="Observed a test condition without evidence string.",
        recommendation=None,
        score_contribution=15,
    )
    finding_whitespace_evidence = SecurityFinding(
        rule_id="R98",
        title="Test Rule Blank Evidence",
        severity="low",
        triggered=True,
        evidence="   ",
        explanation="Blank evidence should fall back cleanly.",
        recommendation=None,
        score_contribution=5,
    )
    ml_unavailable = MLResult(
        available=False,
        model_version=None,
        prediction=None,
        confidence=None,
        note="Model not loaded.",
    )

    reasons = _build_reasons(
        [finding_no_evidence, finding_whitespace_evidence],
        ml_unavailable,
        RiskCategory.SUSPICIOUS,
    )
    assert len(reasons) == 2
    assert reasons[0] == "Test Rule Without Evidence: Observed a test condition without evidence string."
    assert reasons[1] == "Test Rule Blank Evidence: Blank evidence should fall back cleanly."
    assert not any("None" in r for r in reasons)

    # Also test ML available with None confidence does not crash or fabricate a number
    ml_no_conf = MLResult(
        available=True,
        model_version="1.0.0",
        prediction="phishing",
        confidence=None,
        note="Test note.",
    )
    reasons_ml = _build_reasons([], ml_no_conf, RiskCategory.HIGH_RISK)
    assert len(reasons_ml) == 1
    assert "unknown model confidence" in reasons_ml[0]


def test_malformed_scan_requests_rejected():
    for bad_payload in [
        {"url": None},
        {"url": 12345},
        {"url": "   "},
        {"url": "http://invalid host with spaces.com"},
    ]:
        resp = client.post("/api/v1/scan", json=bad_payload)
        assert resp.status_code == 422

