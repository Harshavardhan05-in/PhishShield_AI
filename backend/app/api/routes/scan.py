"""
PhishShield AI — API Routes: /scan and /health and /model-status
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
import logging

from app.schemas.scan import ScanRequest, ScanResponse, HealthResponse, ModelStatusResponse
from app.services.scan_service import run_scan
from app.ml.model_manager import model_manager
from app.ml.feature_extractor import ML_FEATURE_NAMES

logger = logging.getLogger("phishshield")

# ── Scan router ───────────────────────────────────────────────────────────────
router = APIRouter(tags=["scan"])


@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="Analyse a URL for phishing indicators",
)
async def scan_url(request: Request, body: ScanRequest):
    """
    Submit a URL for phishing analysis.

    The response contains:
    - A heuristic risk score (0–100) — NOT a calibrated probability.
    - A risk category (safe / suspicious / high_risk).
    - ML model prediction (if model is loaded).
    - Security rule findings with evidence and explanations.
    - Recommended next steps.
    """
    try:
        result = run_scan(body.url)
        return result
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Scan error for {body.url!r}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred during analysis. Please try again.",
        )


# ── Health router ─────────────────────────────────────────────────────────────
@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Backend health check",
)
async def health():
    return HealthResponse(
        status="ok",
        version="1.0.0",
        ml_model_available=model_manager.is_available(),
        rule_engine_available=True,
    )


@router.get(
    "/model-status",
    response_model=ModelStatusResponse,
    summary="ML model availability and metadata",
)
async def model_status():
    available = model_manager.is_available()
    return ModelStatusResponse(
        available=available,
        model_version=model_manager.model_version if available else None,
        feature_count=model_manager.get_feature_count(),
        training_note=(
            "Random Forest trained on URL-structure features derived from "
            "PhishTank phishing URLs and Tranco legitimate URLs. "
            "See train_model.py for full details."
        ) if available else (
            "Model not loaded. Run train_model.py to generate the model file."
        ),
        limitations=[
            "Model trained on publicly available URL datasets with known geographic and temporal biases.",
            "Model features are URL-structure only — no page content or WHOIS data.",
            "Model confidence is the class probability from Random Forest, not a calibrated score.",
            "The model is not updated in real time and may miss new phishing patterns.",
        ],
    )
