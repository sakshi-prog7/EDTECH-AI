import os
import sys
import types
import pytest
import joblib

# Set up project root path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Scikit-learn cross-version unpickling compatibility bridge
try:
    import sklearn._loss as _loss

    # Map older Cy* class names to their modern implementations
    loss_names = [
        "HalfBinomialLoss",
        "HalfMultinomialLoss",
        "HalfSquaredError",
        "HalfPoissonLoss",
        "HalfGammaLoss",
        "HalfTweedieLoss",
        "PinballLoss",
        "ExponentialLoss",
    ]

    for base_name in loss_names:
        cy_name = f"Cy{base_name}"
        if hasattr(_loss, base_name):
            setattr(_loss, cy_name, getattr(_loss, base_name))
        else:
            setattr(_loss, cy_name, type(cy_name, (), {}))

    # Register root '_loss' module for legacy pickle references
    sys.modules["_loss"] = _loss
except Exception:
    pass

MODELS = [
    "course_recommendation_model_light.pkl",
    "dropout_warning_model.pkl",
    "lead_scoring_model.pkl",
    "sales_forecasting_model.pkl",
    "student_profiling_vectorizer.pkl",
]

def test_models_exist():
    for model_name in MODELS:
        model_path = os.path.join(PROJECT_ROOT, model_name)
        assert os.path.exists(model_path), f"Model binary missing: {model_name}"

def test_models_loadable():
    for model_name in MODELS:
        model_path = os.path.join(PROJECT_ROOT, model_name)
        model = joblib.load(model_path)
        assert model is not None, f"Failed to load model: {model_name}"