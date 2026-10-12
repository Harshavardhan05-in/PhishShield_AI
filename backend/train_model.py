"""
PhishShield AI — ML Model Training Script

This script generates a phishing detection model from synthetic URL-structure
features. Because downloading large external datasets in a constrained
environment is not guaranteed, we generate a reproducible synthetic dataset
that faithfully represents the URL-structure feature distributions observed
in published phishing research.

Dataset provenance:
  - Feature distributions are derived from published analyses of PhishTank
    (https://www.phishtank.com/) and the Tranco list
    (https://tranco-list.eu/).
  - THIS IS A SYNTHETIC TRAINING SET. The model is for demonstration only.
  - Real-world accuracy depends on training with actual labelled URL datasets.
  - Labelled phishing datasets can be obtained from PhishTank API (free),
    OpenPhish (free tier), or academic repositories like UCI ML Repository.

Run:
    python train_model.py

Output:
    models/phishshield_model.joblib
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import os
import random
import json

RANDOM_SEED = 42
NUM_SAMPLES = 8000   # 4000 phishing + 4000 legitimate
MODEL_OUTPUT = os.path.join(os.path.dirname(__file__), "models", "phishshield_model.joblib")

np.random.seed(RANDOM_SEED)
random.seed(RANDOM_SEED)


def _synthetic_phishing_row():
    """Generate feature values representative of phishing URLs."""
    url_length = int(np.random.normal(120, 30))
    hostname_length = int(np.random.normal(40, 15))
    is_ip = int(random.random() < 0.15)
    subdomain_count = int(np.random.choice([0, 1, 2, 3, 4], p=[0.1, 0.2, 0.3, 0.25, 0.15]))
    num_hyphens = int(np.random.choice([0, 1, 2, 3, 4], p=[0.2, 0.3, 0.25, 0.15, 0.1]))
    num_dots = int(np.random.normal(4, 1.5))
    is_https = int(random.random() < 0.45)  # Some phishing sites do use HTTPS
    suspicious_tld = int(random.random() < 0.4)
    brand_in_subdomain = int(random.random() < 0.35)
    brand_in_path = int(random.random() < 0.3)
    keyword_count = int(np.random.choice([0, 1, 2, 3, 4], p=[0.1, 0.2, 0.3, 0.25, 0.15]))
    num_at = int(random.random() < 0.12)
    has_hex = int(random.random() < 0.2)
    domain_entropy = round(np.random.normal(3.8, 0.5), 4)
    hostname_entropy = round(np.random.normal(3.9, 0.5), 4)
    query_length = int(np.random.normal(80, 40))
    path_length = int(np.random.normal(60, 25))
    num_equal = int(np.random.normal(4, 2))
    num_ampersand = int(np.random.normal(3, 1.5))
    has_redirect = int(random.random() < 0.25)
    has_userinfo = int(random.random() < 0.08)
    query_param_count = int(np.random.normal(5, 2))
    num_underscores = int(np.random.choice([0, 1, 2], p=[0.5, 0.3, 0.2]))
    num_question = int(random.random() < 0.7)
    num_slash = int(np.random.normal(6, 2))
    num_digits_in_domain = int(np.random.normal(3, 2))
    has_port = int(random.random() < 0.08)
    path_depth = int(np.random.normal(3, 1.5))
    has_fragment = int(random.random() < 0.1)

    return [
        max(20, url_length), max(5, hostname_length), max(0, path_length),
        max(0, query_length), max(1, num_dots), max(0, num_hyphens),
        max(0, num_underscores), num_at, num_question, max(0, num_ampersand),
        max(0, num_equal), max(1, num_slash), max(0, num_digits_in_domain),
        max(0, subdomain_count), is_https, is_ip, has_port,
        max(0, path_depth), has_fragment, has_userinfo,
        max(0, domain_entropy), max(0, hostname_entropy), suspicious_tld,
        has_redirect, has_hex, max(0, query_param_count),
        brand_in_subdomain, brand_in_path, keyword_count,
    ]


def _synthetic_legitimate_row():
    """Generate feature values representative of legitimate URLs."""
    url_length = int(np.random.normal(55, 20))
    hostname_length = int(np.random.normal(18, 8))
    is_ip = 0
    subdomain_count = int(np.random.choice([0, 1, 2], p=[0.4, 0.45, 0.15]))
    num_hyphens = int(np.random.choice([0, 1], p=[0.7, 0.3]))
    num_dots = int(np.random.normal(2, 0.7))
    is_https = int(random.random() < 0.85)
    suspicious_tld = int(random.random() < 0.05)
    brand_in_subdomain = 0
    brand_in_path = int(random.random() < 0.05)
    keyword_count = int(np.random.choice([0, 1], p=[0.8, 0.2]))
    num_at = 0
    has_hex = int(random.random() < 0.03)
    domain_entropy = round(np.random.normal(2.8, 0.4), 4)
    hostname_entropy = round(np.random.normal(2.9, 0.4), 4)
    query_length = int(np.random.normal(20, 15))
    path_length = int(np.random.normal(20, 15))
    num_equal = int(np.random.normal(1, 0.8))
    num_ampersand = int(np.random.normal(0.5, 0.5))
    has_redirect = int(random.random() < 0.05)
    has_userinfo = 0
    query_param_count = int(np.random.normal(1, 1))
    num_underscores = 0
    num_question = int(random.random() < 0.3)
    num_slash = int(np.random.normal(3, 1))
    num_digits_in_domain = int(np.random.normal(0.5, 0.8))
    has_port = 0
    path_depth = int(np.random.normal(1, 0.8))
    has_fragment = int(random.random() < 0.05)

    return [
        max(10, url_length), max(4, hostname_length), max(0, path_length),
        max(0, query_length), max(1, num_dots), max(0, num_hyphens),
        max(0, num_underscores), num_at, num_question, max(0, num_ampersand),
        max(0, num_equal), max(1, num_slash), max(0, num_digits_in_domain),
        max(0, subdomain_count), is_https, is_ip, has_port,
        max(0, path_depth), has_fragment, has_userinfo,
        max(0, domain_entropy), max(0, hostname_entropy), suspicious_tld,
        has_redirect, has_hex, max(0, query_param_count),
        brand_in_subdomain, brand_in_path, keyword_count,
    ]


FEATURE_NAMES = [
    "url_length", "hostname_length", "path_length", "query_length",
    "num_dots", "num_hyphens", "num_underscores", "num_at",
    "num_question", "num_ampersand", "num_equal", "num_slash",
    "num_digits_in_domain", "subdomain_count", "is_https",
    "is_ip_address", "has_port", "path_depth", "has_fragment",
    "has_userinfo", "domain_entropy", "hostname_entropy",
    "suspicious_tld", "num_redirect_params", "has_hex_encoding",
    "query_param_count", "brand_in_subdomain", "brand_in_path",
    "keyword_count",
]


def main():
    print("=" * 60)
    print("PhishShield AI — Model Training")
    print("=" * 60)
    print(f"\nGenerating synthetic training data ({NUM_SAMPLES} samples)…")

    n_phishing = NUM_SAMPLES // 2
    n_legit = NUM_SAMPLES // 2

    phishing_data = [_synthetic_phishing_row() for _ in range(n_phishing)]
    legit_data = [_synthetic_legitimate_row() for _ in range(n_legit)]

    X_phishing = pd.DataFrame(phishing_data, columns=FEATURE_NAMES)
    X_legit = pd.DataFrame(legit_data, columns=FEATURE_NAMES)

    X = pd.concat([X_phishing, X_legit], ignore_index=True)
    y = np.array([1] * n_phishing + [0] * n_legit)

    # Shuffle
    idx = np.random.permutation(len(X))
    X = X.iloc[idx].reset_index(drop=True)
    y = y[idx]

    print(f"  Phishing samples: {n_phishing}")
    print(f"  Legitimate samples: {n_legit}")
    print(f"  Features: {len(FEATURE_NAMES)}\n")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    # Scale
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train
    print("Training Random Forest classifier…")
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        class_weight="balanced",
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )
    clf.fit(X_train_scaled, y_train)
    print("Training complete.\n")

    # Evaluate
    y_pred = clf.predict(X_test_scaled)
    print("Classification Report (test set):")
    print(classification_report(y_test, y_pred, target_names=["legitimate", "phishing"]))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Save
    os.makedirs(os.path.dirname(MODEL_OUTPUT), exist_ok=True)
    bundle = {"model": clf, "scaler": scaler, "feature_names": FEATURE_NAMES}
    joblib.dump(bundle, MODEL_OUTPUT)
    print(f"\nModel saved to: {MODEL_OUTPUT}")
    print("\n[!] LIMITATION NOTICE:")
    print("   This model was trained on a SYNTHETIC dataset.")
    print("   It is suitable for demonstration purposes only.")
    print("   For production use, train on real labelled phishing data.")
    print("   See README.md for dataset sources.")
    print("=" * 60)


if __name__ == "__main__":
    main()
