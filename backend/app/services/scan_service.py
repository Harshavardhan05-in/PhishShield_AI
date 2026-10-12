"""
PhishShield AI — Scan Service

Orchestrates:
  1. Feature extraction
  2. ML inference (if model available)
  3. Rule-based analysis
  4. Score aggregation (documented policy below)
  5. Response assembly

Scoring Policy (Documented):
  - Rules contribute individual heuristic scores (0–100 scale each).
  - Rule contributions are summed and capped at 80 (the rule ceiling).
  - ML prediction (when available) contributes an additional 0–20 points.
  - If ML predicts phishing with high confidence, add 20; lower confidence adds proportionally less.
  - Final score = min(100, rule_score + ml_bonus).
  - Category thresholds: <35 → safe, 35–64 → suspicious, ≥65 → high_risk.

This is a heuristic system. The score is NOT a calibrated probability.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.schemas.scan import (
    ScanResponse, RiskCategory, MLResult, SecurityFinding
)
from app.ml.feature_extractor import extract_features
from app.ml.model_manager import model_manager
from app.services.rule_engine import analyze_url


# Score thresholds
SAFE_THRESHOLD = 35
HIGH_RISK_THRESHOLD = 65

ANALYSIS_LIMITATIONS = [
    "Analysis is based solely on URL structure — no page content or network requests are made.",
    "The heuristic rule scores are not calibrated probabilities of phishing.",
    "Brand-spoofing detection uses a limited reference list; unlisted brands are not checked.",
    "A clean scan does not guarantee a URL is safe — it means no significant indicators were detected by the available checks.",
    "HTTPS presence does not indicate site legitimacy.",
    "The ML model (when available) was trained on publicly available datasets with known biases and limitations.",
]


def _categorise(score: int) -> RiskCategory:
    if score < SAFE_THRESHOLD:
        return RiskCategory.SAFE
    elif score < HIGH_RISK_THRESHOLD:
        return RiskCategory.SUSPICIOUS
    else:
        return RiskCategory.HIGH_RISK


def _build_reasons(
    findings: list,
    ml_result: MLResult,
    category: RiskCategory,
) -> list:
    """
    Build human-readable reasons from triggered rule findings and ML result.
    Each reason includes the finding title, detected evidence (if present), and the
    full explanation — sourced exclusively from what the rule engine detected.
    No data is invented; if evidence is absent the explanation is used alone.
    """
    reasons = []

    triggered = [f for f in findings if f.triggered]
    for f in triggered:
        # Build a concise but complete reason: "Title — Evidence. Explanation."
        ev = (f.evidence or "").strip()
        if ev:
            ev_clean = ev.rstrip(".")
            reason = f"{f.title} — {ev_clean}. {f.explanation}"
        else:
            reason = f"{f.title}: {f.explanation}"
        reasons.append(reason)

    if ml_result and ml_result.available and ml_result.prediction:
        if ml_result.prediction == "phishing":
            conf_pct = (
                f"{ml_result.confidence * 100:.0f}%"
                if ml_result.confidence is not None
                else "unknown"
            )
            reasons.append(
                f"ML model (Random Forest) predicted phishing with {conf_pct} model confidence. "
                f"Note: {ml_result.note or 'Model accuracy depends on training data quality.'}"
            )
        else:
            reasons.append(
                "ML model (Random Forest) predicted legitimate — no strong phishing pattern "
                "detected by the model's feature set."
            )

    if not reasons:
        if category == RiskCategory.SAFE:
            reasons.append(
                "No significant phishing indicators were detected by the available URL-structure checks."
            )
        else:
            reasons.append("Combined heuristic signals elevated the risk score above the safe threshold.")

    return reasons


def _build_recommendations(category: RiskCategory, findings: list) -> list:
    if category == RiskCategory.HIGH_RISK:
        return [
            "Do NOT enter passwords, OTPs, payment information, or any sensitive data on this page.",
            "Close this tab immediately if you have already navigated to this URL.",
            "Report the URL to your organisation's security team or to a public phishing database such as PhishTank.",
            "Verify the intended service through a trusted bookmark or official search result.",
            "Consider running a full anti-malware scan if you have already interacted with the page.",
        ]
    elif category == RiskCategory.SUSPICIOUS:
        return [
            "Verify this domain through an independently obtained official source before proceeding.",
            "Do not enter credentials or sensitive data until you have confirmed the site is legitimate.",
            "Check the domain registration age and WHOIS data using a trusted lookup service.",
            "If a trusted contact sent you this link, confirm with them through a separate communication channel.",
        ]
    else:
        return [
            "No significant phishing indicators were detected by the available URL-structure checks.",
            "This result does not guarantee the URL is safe — always exercise caution.",
            "Ensure the site uses HTTPS before submitting any sensitive information.",
            "Keep your browser and security software up to date.",
        ]


def run_scan(url: str) -> ScanResponse:
    """
    Orchestrate a full phishing analysis for the submitted URL.
    """
    scan_id = str(uuid.uuid4())
    scanned_at = datetime.now(timezone.utc).isoformat()

    # 1. Feature extraction
    extracted = extract_features(url)
    features = extracted["features"]
    meta = extracted["meta"]

    # 2. ML inference
    ml_prediction, ml_confidence = model_manager.predict(features)
    ml_available = model_manager.is_available()

    ml_result = MLResult(
        available=ml_available,
        model_version=model_manager.model_version if ml_available else None,
        prediction=ml_prediction,
        confidence=ml_confidence,
        note=(
            "Trained on a synthetic URL-features dataset derived from public PhishTank and Tranco data. "
            "Model accuracy is limited by dataset representativeness. See README for details."
        ) if ml_available else (
            "The ML model is not loaded. Run train_model.py to generate and load the model. "
            "Analysis is currently based on heuristic security rules only."
        ),
    )

    # 3. Rule-based analysis
    findings = analyze_url(features, meta)

    # 4. Score aggregation (see module docstring for policy)
    rule_score = sum(f.score_contribution for f in findings if f.triggered)
    rule_score = min(rule_score, 80)  # Cap rule contribution

    ml_bonus = 0
    if ml_available and ml_prediction == "phishing":
        conf = ml_confidence or 0.5
        ml_bonus = int(20 * conf)

    final_score = min(100, rule_score + ml_bonus)

    # 5. Categorise
    category = _categorise(final_score)

    # 6. Human-readable assembly
    triggered_findings = [f for f in findings if f.triggered]
    reasons = _build_reasons(findings, ml_result, category)
    recommendations = _build_recommendations(category, findings)

    analysis_method = (
        "Hybrid: ML Random Forest + 12 heuristic security rules"
        if ml_available
        else "Rule-only: 12 heuristic security rules (ML model not loaded)"
    )

    return ScanResponse(
        url=url,
        normalized_url=url,
        risk_score=final_score,
        risk_category=category,
        ml_result=ml_result,
        findings=findings,
        triggered_findings=triggered_findings,
        reasons=reasons,
        recommended_actions=recommendations,
        scan_id=scan_id,
        scanned_at=scanned_at,
        analysis_method=analysis_method,
        limitations=ANALYSIS_LIMITATIONS,
    )
