"""
PhishShield AI — Application Settings
"""
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        protected_namespaces=("settings_",),
    )

    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    api_version: str = "v1"

    allowed_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    model_path: str = "models/phishshield_model.joblib"
    max_url_length: int = 2048
    request_timeout_seconds: int = 30


settings = Settings()
