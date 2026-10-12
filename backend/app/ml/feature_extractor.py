"""
PhishShield AI — URL Feature Extractor
Extracts deterministic features from URLs for ML inference and rule analysis.
"""
import re
import math
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any, Optional
import tldextract


# Known legitimate brand names to check for spoofing patterns
KNOWN_BRANDS = [
    "paypal", "apple", "google", "microsoft", "amazon", "facebook",
    "instagram", "twitter", "netflix", "bank", "chase", "wellsfargo",
    "citibank", "hsbc", "barclays", "ebay", "linkedin", "dropbox",
    "outlook", "yahoo", "icloud", "gmail", "youtube", "tiktok",
]

# Suspicious TLDs (higher phishing prevalence — not definitive proof)
SUSPICIOUS_TLDS = {
    "tk", "ml", "ga", "cf", "gq", "xyz", "pw", "top", "click",
    "link", "download", "loan", "win", "stream", "gdn", "racing",
    "accountant", "review", "trade", "date", "faith", "cricket",
}

# Suspicious keywords in URLs
SUSPICIOUS_KEYWORDS = [
    "login", "signin", "verify", "secure", "account", "update",
    "confirm", "banking", "password", "credential", "wallet",
    "suspended", "unlock", "validate", "billing", "urgent",
    "limited", "expire", "click", "free", "prize", "won",
]


def _entropy(s: str) -> float:
    """Shannon entropy of a string — high entropy may indicate random subdomains."""
    if not s:
        return 0.0
    prob = [s.count(c) / len(s) for c in set(s)]
    return -sum(p * math.log2(p) for p in prob if p > 0)


def extract_features(url: str) -> Dict[str, Any]:
    """
    Extract URL-level features. All features are derived solely from the
    submitted URL string; no network requests are made.

    Returns a dict of feature names → values and a separate 'meta' dict
    containing richer contextual data for the rule engine.
    """
    parsed = urlparse(url)
    ext = tldextract.extract(url)

    scheme = parsed.scheme.lower()
    hostname = parsed.hostname or ""
    path = parsed.path or ""
    query = parsed.query or ""
    fragment = parsed.fragment or ""
    full_url = url
    domain = ext.domain.lower()
    suffix = ext.suffix.lower()
    subdomain = ext.subdomain.lower()
    userinfo = parsed.username or ""

    # ── Numeric features (used for ML) ───────────────────────────────────────
    url_length = len(full_url)
    hostname_length = len(hostname)
    path_length = len(path)
    query_length = len(query)
    num_dots = hostname.count(".")
    num_hyphens = hostname.count("-")
    num_underscores = hostname.count("_")
    num_at = full_url.count("@")
    num_question = full_url.count("?")
    num_ampersand = full_url.count("&")
    num_equal = full_url.count("=")
    num_slash = full_url.count("/")
    num_digits_in_domain = sum(c.isdigit() for c in domain)
    subdomain_count = len([s for s in subdomain.split(".") if s]) if subdomain else 0
    is_https = int(scheme == "https")
    is_ip_address = int(
        bool(re.match(r"^\d{1,3}(\.\d{1,3}){3}$", hostname))
        or bool(re.match(r"^\[?[0-9a-fA-F:]+\]?$", hostname))
    )
    has_port = int(parsed.port is not None)
    path_depth = path.count("/") - 1 if path.count("/") > 0 else 0
    has_fragment = int(bool(fragment))
    has_userinfo = int(bool(userinfo))
    domain_entropy = _entropy(domain)
    hostname_entropy = _entropy(hostname.replace(".", ""))
    suspicious_tld = int(suffix in SUSPICIOUS_TLDS)
    num_redirect_params = int("redirect" in query.lower() or "url=" in query.lower())
    has_hex_encoding = int("%2f" in full_url.lower() or "%40" in full_url.lower())
    query_param_count = len(parse_qs(query)) if query else 0

    # Brand spoofing: brand in subdomain or path, but NOT in domain
    brand_in_subdomain = 0
    brand_in_path = 0
    spoofed_brand = None
    for brand in KNOWN_BRANDS:
        if brand in subdomain and brand not in domain:
            brand_in_subdomain = 1
            spoofed_brand = brand
            break
        if brand in path.lower() and brand not in domain:
            brand_in_path = 1
            if spoofed_brand is None:
                spoofed_brand = brand

    # Suspicious keywords
    keyword_count = sum(
        1 for kw in SUSPICIOUS_KEYWORDS if kw in full_url.lower()
    )

    features = {
        "url_length": url_length,
        "hostname_length": hostname_length,
        "path_length": path_length,
        "query_length": query_length,
        "num_dots": num_dots,
        "num_hyphens": num_hyphens,
        "num_underscores": num_underscores,
        "num_at": num_at,
        "num_question": num_question,
        "num_ampersand": num_ampersand,
        "num_equal": num_equal,
        "num_slash": num_slash,
        "num_digits_in_domain": num_digits_in_domain,
        "subdomain_count": subdomain_count,
        "is_https": is_https,
        "is_ip_address": is_ip_address,
        "has_port": has_port,
        "path_depth": path_depth,
        "has_fragment": has_fragment,
        "has_userinfo": has_userinfo,
        "domain_entropy": round(domain_entropy, 4),
        "hostname_entropy": round(hostname_entropy, 4),
        "suspicious_tld": suspicious_tld,
        "num_redirect_params": num_redirect_params,
        "has_hex_encoding": has_hex_encoding,
        "query_param_count": query_param_count,
        "brand_in_subdomain": brand_in_subdomain,
        "brand_in_path": brand_in_path,
        "keyword_count": keyword_count,
    }

    # ── Meta (rule engine context — not passed to ML model directly) ──────────
    meta = {
        "scheme": scheme,
        "hostname": hostname,
        "domain": domain,
        "suffix": suffix,
        "subdomain": subdomain,
        "path": path,
        "query": query,
        "fragment": fragment,
        "userinfo": userinfo,
        "spoofed_brand": spoofed_brand,
        "suspicious_keywords_found": [
            kw for kw in SUSPICIOUS_KEYWORDS if kw in full_url.lower()
        ],
    }

    return {"features": features, "meta": meta}


# Ordered feature list used for ML inference (must match training order)
ML_FEATURE_NAMES = [
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
