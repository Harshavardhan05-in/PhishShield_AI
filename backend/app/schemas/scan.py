"""
PhishShield AI — Pydantic Schemas
"""
from pydantic import BaseModel, field_validator, HttpUrl
from typing import Optional, List
from enum import Enum
import re


class RiskCategory(str, Enum):
    SAFE = "safe"
    SUSPICIOUS = "suspicious"
    HIGH_RISK = "high_risk"


class ScanRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL must not be empty.")
        # Add scheme if missing
        if not re.match(r"^https?://", v, re.IGNORECASE):
            v = "http://" + v
        # Basic structure check
        if not re.match(
            r"^https?://[^\s/$.?#].[^\s]*$", v, re.IGNORECASE
        ):
            raise ValueError("The submitted value does not appear to be a valid URL.")
        if len(v) > 2048:
            raise ValueError("URL exceeds the maximum allowed length of 2048 characters.")
        return v


class SecurityFinding(BaseModel):
    rule_id: str
    title: str
    severity: str  # "info" | "low" | "medium" | "high" | "critical"
    triggered: bool
    evidence: Optional[str] = None
    explanation: str
    recommendation: Optional[str] = None
    score_contribution: int = 0


class MLResult(BaseModel):
    available: bool
    model_version: Optional[str] = None
    prediction: Optional[str] = None      # "phishing" | "legitimate"
    confidence: Optional[float] = None    # 0.0–1.0 when available
    note: Optional[str] = None            # Limitations disclaimer


class ScanResponse(BaseModel):
    url: str
    normalized_url: str
    risk_score: int                        # 0–100
    risk_category: RiskCategory
    ml_result: MLResult
    findings: List[SecurityFinding]
    triggered_findings: List[SecurityFinding]
    reasons: List[str]
    recommended_actions: List[str]
    scan_id: str
    scanned_at: str
    analysis_method: str
    limitations: List[str]


class HealthResponse(BaseModel):
    status: str
    version: str
    ml_model_available: bool
    rule_engine_available: bool


class ModelStatusResponse(BaseModel):
    available: bool
    model_version: Optional[str] = None
    feature_count: Optional[int] = None
    training_note: Optional[str] = None
    limitations: List[str] = []
