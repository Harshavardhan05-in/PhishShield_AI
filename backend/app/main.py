"""
PhishShield AI — FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging import setup_logging
from app.api.routes import scan
from app.ml.model_manager import model_manager

logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — load model on startup."""
    logger.info("PhishShield AI backend starting up…")
    model_manager.load_model()
    if model_manager.is_available():
        logger.info("ML model loaded successfully.")
    else:
        logger.warning(
            "ML model not available — rule-based analysis only. "
            "Run train_model.py to generate the model."
        )
    yield
    logger.info("PhishShield AI backend shutting down.")


app = FastAPI(
    title="PhishShield AI",
    description=(
        "Phishing URL detection API combining machine-learning predictions "
        "with explainable security-rule analysis."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^(chrome-extension://.*|http://(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)

from fastapi.exception_handlers import request_validation_exception_handler as default_validation_handler

# ── Error Handlers ────────────────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
    return await default_validation_handler(request, exc)


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(scan.router, prefix=f"/api/{settings.api_version}")


@app.get("/", include_in_schema=False)
async def root():
    return {
        "product": "PhishShield AI",
        "version": "1.0.0",
        "docs": "/docs",
        "health": f"/api/{settings.api_version}/health",
    }
