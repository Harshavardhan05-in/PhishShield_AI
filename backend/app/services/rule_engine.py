"""
PhishShield AI — Explainable Security Rule Engine

Each rule is deterministic and returns a SecurityFinding with:
  - Whether the rule triggered
  - Evidence observed
  - Human-readable explanation
  - A score contribution (0–100 scale, capped in the aggregator)

Score contributions are NOT probabilities. They are heuristic weights
determined by the relative severity of each signal. The final score
is the combination of rule contributions and ML prediction — see
services/scan_service.py for the scoring policy.
"""
from typing import List, Dict, Any
from app.schemas.scan import SecurityFinding


def _finding(
    rule_id: str,
    title: str,
    severity: str,
    triggered: bool,
    evidence: str,
    explanation: str,
    recommendation: str,
    score_contribution: int,
) -> SecurityFinding:
    return SecurityFinding(
        rule_id=rule_id,
        title=title,
        severity=severity,
        triggered=triggered,
        evidence=evidence,
        explanation=explanation,
        recommendation=recommendation,
        score_contribution=score_contribution if triggered else 0,
    )


def analyze_url(features: Dict[str, Any], meta: Dict[str, Any]) -> List[SecurityFinding]:
    """
    Run all security rules against the extracted URL features and metadata.
    Returns a list of SecurityFinding objects, one per rule.
    """
    findings: List[SecurityFinding] = []

    # ── RULE 1: IP Address Host ───────────────────────────────────────────────
    is_ip = features.get("is_ip_address", 0) == 1
    findings.append(_finding(
        rule_id="R01",
        title="IP Address Used as Host",
        severity="high",
        triggered=is_ip,
        evidence=meta.get("hostname", "") if is_ip else "No IP address detected.",
        explanation=(
            "The URL uses a raw IP address instead of a registered domain name. "
            "Legitimate services overwhelmingly use domain names. "
            "IP-based URLs are commonly used in phishing campaigns to avoid domain registration."
        ) if is_ip else (
            "The URL uses a registered domain name, not a raw IP address."
        ),
        recommendation="Do not visit or enter credentials on IP-addressed URLs unless you have an independently verified reason." if is_ip else None,
        score_contribution=30,
    ))

    # ── RULE 2: Excessive Subdomains ─────────────────────────────────────────
    sub_count = features.get("subdomain_count", 0)
    excessive_subdomains = sub_count >= 3
    findings.append(_finding(
        rule_id="R02",
        title="Excessive Subdomain Depth",
        severity="medium",
        triggered=excessive_subdomains,
        evidence=f"{sub_count} subdomain level(s) detected: {meta.get('subdomain', '')}" if excessive_subdomains else f"{sub_count} subdomain level(s).",
        explanation=(
            f"The URL contains {sub_count} subdomain levels. "
            "Attackers use deep subdomain hierarchies to embed recognisable brand names "
            "while keeping a different actual registered domain."
        ) if excessive_subdomains else (
            f"The URL has {sub_count} subdomain level(s), which is within normal range."
        ),
        recommendation="Verify the registered domain (the part before the TLD), not just the subdomain." if excessive_subdomains else None,
        score_contribution=20,
    ))

    # ── RULE 3: URL Length ────────────────────────────────────────────────────
    url_len = features.get("url_length", 0)
    very_long = url_len > 100
    findings.append(_finding(
        rule_id="R03",
        title="Abnormally Long URL",
        severity="low",
        triggered=very_long,
        evidence=f"URL length: {url_len} characters.",
        explanation=(
            f"The URL is {url_len} characters long. "
            "Very long URLs are frequently used to obscure the true destination "
            "or embed malicious parameters."
        ) if very_long else (
            f"URL length ({url_len} characters) is within normal bounds."
        ),
        recommendation="Be cautious with URLs significantly longer than the site name alone would require." if very_long else None,
        score_contribution=10,
    ))

    # ── RULE 4: Brand Spoofing in Subdomain ──────────────────────────────────
    brand_subdomain = features.get("brand_in_subdomain", 0) == 1
    spoofed = meta.get("spoofed_brand")
    findings.append(_finding(
        rule_id="R04",
        title="Possible Brand Name Spoofing (Subdomain)",
        severity="high",
        triggered=brand_subdomain,
        evidence=f"Brand '{spoofed}' appears in the subdomain but not the registered domain." if brand_subdomain else "No known brand name detected in subdomain with mismatched domain.",
        explanation=(
            f"The subdomain contains '{spoofed}', a known brand name, "
            f"but the registered domain is '{meta.get('domain')}'. "
            "This is a common technique to deceive users into thinking they are visiting a legitimate site."
        ) if brand_subdomain else (
            "No subdomain brand-spoofing pattern was detected based on the reference list."
        ),
        recommendation=f"Navigate directly to the official {spoofed} website using a trusted bookmark or search engine." if brand_subdomain else None,
        score_contribution=35,
    ))

    # ── RULE 5: Brand Spoofing in Path ───────────────────────────────────────
    brand_path = features.get("brand_in_path", 0) == 1
    findings.append(_finding(
        rule_id="R05",
        title="Possible Brand Name in URL Path",
        severity="medium",
        triggered=brand_path and not brand_subdomain,
        evidence=f"Brand keyword '{spoofed}' found in URL path." if (brand_path and not brand_subdomain) else "No brand keyword detected in path.",
        explanation=(
            f"The URL path contains '{spoofed}', a known brand keyword. "
            "While this alone is not conclusive, it is sometimes used to create a misleading appearance."
        ) if (brand_path and not brand_subdomain) else (
            "No suspicious brand name was detected in the URL path."
        ),
        recommendation="Verify the actual registered domain does belong to the expected organisation." if (brand_path and not brand_subdomain) else None,
        score_contribution=15,
    ))

    # ── RULE 6: Suspicious TLD ────────────────────────────────────────────────
    sus_tld = features.get("suspicious_tld", 0) == 1
    findings.append(_finding(
        rule_id="R06",
        title="Suspicious Top-Level Domain",
        severity="medium",
        triggered=sus_tld,
        evidence=f"TLD: .{meta.get('suffix', '')}",
        explanation=(
            f"The domain uses the .{meta.get('suffix', '')} TLD, which appears at higher-than-average "
            "rates in phishing datasets. This is a statistical indicator, not definitive proof. "
            "Many legitimate sites use these TLDs."
        ) if sus_tld else (
            f"The .{meta.get('suffix', '')} TLD is not among those with elevated phishing prevalence in available datasets."
        ),
        recommendation="Apply additional scrutiny but do not treat the TLD alone as confirmation of phishing." if sus_tld else None,
        score_contribution=12,
    ))

    # ── RULE 7: @ Symbol in URL ───────────────────────────────────────────────
    has_at = features.get("num_at", 0) > 0
    findings.append(_finding(
        rule_id="R07",
        title="User-Information Syntax (@) in URL",
        severity="high",
        triggered=has_at,
        evidence=f"@ symbol count: {features.get('num_at', 0)}",
        explanation=(
            "The URL contains an @ symbol. Browsers treat text before the @ as "
            "user credentials and navigate to what follows. This technique is used "
            "to display a legitimate-looking domain before the @ while actually "
            "directing the browser to a different host."
        ) if has_at else (
            "No @ symbol detected in the URL."
        ),
        recommendation="Treat any URL with an @ symbol with extreme caution." if has_at else None,
        score_contribution=40,
    ))

    # ── RULE 8: HTTPS Scheme ─────────────────────────────────────────────────
    is_https = features.get("is_https", 0) == 1
    # Missing HTTPS is a signal but NOT proof — many legitimate sites still use HTTP
    # We only flag this as informational
    findings.append(_finding(
        rule_id="R08",
        title="HTTPS Encryption Status",
        severity="info",
        triggered=not is_https,
        evidence=f"Scheme: {meta.get('scheme', 'unknown')}",
        explanation=(
            "The URL uses HTTP rather than HTTPS. "
            "This means data in transit is not encrypted. "
            "Note: the absence of HTTPS alone is not proof of phishing — "
            "it is an additional risk factor for credential submission."
        ) if not is_https else (
            "The URL uses HTTPS. Encryption is present, but HTTPS does not guarantee a site is legitimate."
        ),
        recommendation="Do not submit passwords or sensitive data over HTTP connections." if not is_https else (
            "HTTPS provides transport encryption but does not verify the legitimacy of the site owner."
        ),
        score_contribution=10,
    ))

    # ── RULE 9: Suspicious Keyword Count ─────────────────────────────────────
    kw_count = features.get("keyword_count", 0)
    found_kws = meta.get("suspicious_keywords_found", [])
    many_keywords = kw_count >= 2
    findings.append(_finding(
        rule_id="R09",
        title="Multiple Suspicious Keywords in URL",
        severity="medium",
        triggered=many_keywords,
        evidence=f"Keywords found: {', '.join(found_kws[:5])}" if found_kws else "No suspicious keywords detected.",
        explanation=(
            f"The URL contains {kw_count} keywords ({', '.join(found_kws[:5])}) "
            "commonly associated with phishing or social engineering. "
            "Each keyword alone is a weak signal; their combination increases the risk indication."
        ) if many_keywords else (
            f"The URL contains {kw_count} suspicious keyword(s). "
            "No unusual keyword concentration was detected."
        ),
        recommendation="Treat URLs with multiple security-related action words with heightened caution." if many_keywords else None,
        score_contribution=18,
    ))

    # ── RULE 10: Hex / Percent Encoding ──────────────────────────────────────
    hex_enc = features.get("has_hex_encoding", 0) == 1
    findings.append(_finding(
        rule_id="R10",
        title="Suspicious Percent-Encoding in URL",
        severity="low",
        triggered=hex_enc,
        evidence="Percent-encoded slash (%2F) or at-sign (%40) detected." if hex_enc else "No suspicious percent-encoding detected.",
        explanation=(
            "The URL contains percent-encoded characters (such as %2F or %40) "
            "that are sometimes used to obscure the true URL structure from casual inspection."
        ) if hex_enc else (
            "No suspicious percent-encoding patterns were detected."
        ),
        recommendation="Decode and inspect the full URL before visiting." if hex_enc else None,
        score_contribution=8,
    ))

    # ── RULE 11: High Domain Entropy ─────────────────────────────────────────
    entropy = features.get("domain_entropy", 0.0)
    high_entropy = entropy > 3.5 and features.get("hostname_length", 0) > 12
    findings.append(_finding(
        rule_id="R11",
        title="High Domain Randomness (Entropy)",
        severity="low",
        triggered=high_entropy,
        evidence=f"Domain entropy: {entropy:.2f} bits. Domain: {meta.get('domain', '')}",
        explanation=(
            f"The domain name has high character entropy ({entropy:.2f} bits), "
            "suggesting it may be algorithmically generated (DGA) rather than a recognisable brand name."
        ) if high_entropy else (
            f"Domain entropy ({entropy:.2f} bits) is within normal range."
        ),
        recommendation="Be cautious of random-looking domain names; verify through official channels." if high_entropy else None,
        score_contribution=8,
    ))

    # ── RULE 12: Redirect Parameter ──────────────────────────────────────────
    has_redirect = features.get("num_redirect_params", 0) > 0
    findings.append(_finding(
        rule_id="R12",
        title="Open Redirect Parameter Detected",
        severity="medium",
        triggered=has_redirect,
        evidence="URL or redirect parameter detected in query string." if has_redirect else "No redirect parameters detected.",
        explanation=(
            "The URL contains a query parameter that may redirect to another URL. "
            "Attackers exploit open redirects on legitimate sites to route victims "
            "through a trusted domain before reaching a malicious one."
        ) if has_redirect else (
            "No open-redirect query parameters were detected."
        ),
        recommendation="Inspect where the redirect parameter points before proceeding." if has_redirect else None,
        score_contribution=15,
    ))

    return findings
