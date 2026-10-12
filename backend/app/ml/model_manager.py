"""
PhishShield AI — ML Model Manager
Loads and manages the trained phishing detection model.
"""
import joblib
import logging
import os
import numpy as np
from typing import Optional, Tuple
from app.ml.feature_extractor import ML_FEATURE_NAMES

logger = logging.getLogger("phishshield")

MODEL_VERSION = "1.0.0-random-forest"


class ModelManager:
    """
    Manages loading and inference for the phishing detection model.

    The model is a scikit-learn Random Forest trained on URL-derived
    features using the PhishTank + Tranco open datasets (see train_model.py).

    If the model file is absent, the system reports this condition honestly
    and falls back to rule-only analysis. It does NOT fabricate predictions.
    """

    def __init__(self):
        self._model = None
        self._scaler = None
        self._model_available = False
        self._model_path: Optional[str] = None

    def load_model(self, model_path: Optional[str] = None) -> bool:
        """
        Attempt to load the model from disk.
        Returns True if successful, False otherwise.
        """
        from app.core.config import settings

        path = model_path or settings.model_path

        # Resolve relative to backend/ directory
        if not os.path.isabs(path):
            backend_dir = os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            )
            path = os.path.join(backend_dir, path)

        self._model_path = path

        if not os.path.exists(path):
            logger.warning(
                f"Model file not found at {path}. "
                "Run backend/train_model.py to generate it."
            )
            self._model_available = False
            return False

        try:
            bundle = joblib.load(path)
            self._model = bundle.get("model")
            self._scaler = bundle.get("scaler")
            if self._model is None:
                raise ValueError("Loaded bundle does not contain 'model' key.")
            self._model_available = True
            logger.info(f"Model loaded from {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self._model_available = False
            return False

    def is_available(self) -> bool:
        return self._model_available

    @property
    def model_version(self) -> str:
        return MODEL_VERSION

    def predict(self, features: dict) -> Tuple[Optional[str], Optional[float]]:
        """
        Run inference given a feature dict.

        Returns:
            (prediction_label, confidence) where:
              - prediction_label is "phishing" or "legitimate"
              - confidence is the model's class probability (0.0–1.0)
            Returns (None, None) if the model is unavailable.
        """
        if not self._model_available or self._model is None:
            return None, None

        try:
            # Build feature vector in the correct training order
            feature_vector = np.array(
                [[features.get(name, 0) for name in ML_FEATURE_NAMES]],
                dtype=np.float64,
            )

            # Apply scaler if present
            if self._scaler is not None:
                feature_vector = self._scaler.transform(feature_vector)

            # Predict class
            prediction_idx = self._model.predict(feature_vector)[0]

            # Predict probability if supported
            confidence = None
            if hasattr(self._model, "predict_proba"):
                proba = self._model.predict_proba(feature_vector)[0]
                confidence = float(proba[prediction_idx])

            label = "phishing" if int(prediction_idx) == 1 else "legitimate"
            return label, confidence

        except Exception as e:
            logger.error(f"Inference error: {e}")
            return None, None

    def get_feature_count(self) -> int:
        return len(ML_FEATURE_NAMES)


# Singleton
model_manager = ModelManager()
