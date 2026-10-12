# PhishShield AI

> **Hackathon-ready phishing URL detection: Chrome extension + React dashboard + FastAPI + Machine Learning**

## What It Does

PhishShield AI analyses suspicious URLs using:
- **12 deterministic security rules** (IP hosts, subdomain depth, brand spoofing, @ syntax, redirect params, etc.)
- **A Random Forest ML model** trained on URL-structure features
- **Transparent, explainable results** — every finding includes evidence, explanation, and recommendation

The URL is never visited. Analysis is based solely on URL structure.

---

## Project Structure

```
phishshield-ai/
├── backend/                    FastAPI backend
│   ├── app/
│   │   ├── main.py             App entry point
│   │   ├── api/routes/scan.py  API endpoints
│   │   ├── schemas/scan.py     Pydantic schemas
│   │   ├── services/
│   │   │   ├── scan_service.py Orchestration + scoring
│   │   │   └── rule_engine.py  12 security rules
│   │   ├── ml/
│   │   │   ├── feature_extractor.py  URL feature extraction
│   │   │   └── model_manager.py      Model loading + inference
│   │   └── core/config.py      Settings
│   ├── models/                 Trained model file (generated)
│   ├── tests/test_api.py       Backend test suite
│   ├── train_model.py          ML training script
│   ├── requirements.txt
│   └── .env.example
│
├── dashboard/                  React + Vite dashboard
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/DashboardPage.jsx
│   │   ├── components/
│   │   │   ├── BrandLogo.jsx
│   │   │   ├── Navigation.jsx
│   │   │   ├── URLScanner.jsx
│   │   │   ├── IntroAnimation.jsx
│   │   │   ├── ScanLoadingState.jsx
│   │   │   ├── RiskScore.jsx
│   │   │   ├── AnalysisSummary.jsx
│   │   │   ├── SecurityFinding.jsx
│   │   │   ├── RecommendedActions.jsx
│   │   │   ├── ErrorState.jsx
│   │   │   └── Footer.jsx
│   │   └── services/api.js     Axios API client
│   ├── .env.example
│   └── package.json
│
└── extension/                  Chrome Extension (Manifest V3)
    ├── manifest.json
    ├── background.js           Service worker (proxy & home navigation)
    ├── popup.html
    ├── popup.css
    ├── popup.js
    └── icons/
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Chrome

---

### 1. Backend Setup

```bash
cd phishshield-ai/backend

# Install dependencies
pip install -r requirements.txt

# Train the ML model (required for ML predictions)
python train_model.py

# Copy and configure environment
cp .env.example .env

# Start the backend
python -m uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API docs: http://localhost:8000/docs

---

### 2. Dashboard Setup

```bash
cd phishshield-ai/dashboard

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start the dev server
npm run dev
```

Dashboard runs at: http://localhost:5173

---

### 3. Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `phishshield-ai/extension/` folder
5. The PhishShield AI extension will appear in your toolbar
6. Pin it by clicking the puzzle icon → pin PhishShield AI

> **Integration Flow:**
> - The popup accepts a suspicious URL and validates input client-side.
> - The extension dispatches the scan to the FastAPI backend (`POST /api/v1/scan`) and opens the React dashboard report tab (`http://localhost:5173/dashboard?url=...`).
> - The new tab plays the 2-second intro animation, displays the live scanning radar, and renders explainable findings with risk scores.
> - **Action buttons:** Safe results display "Continue Browsing" (validating HTTP/HTTPS); high-risk results display "Go to Browser Home Page" (navigating away safely to `chrome://newtab/` without ever visiting the suspicious URL).

---

## Running Tests

```bash
cd phishshield-ai/backend

# Run all backend tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ -v --tb=short
```

---

## API Reference

### POST /api/v1/scan
Analyse a URL for phishing indicators.

**Request:**
```json
{ "url": "https://suspicious-site.example.com/login" }
```

**Response:**
```json
{
  "url": "...",
  "risk_score": 72,
  "risk_category": "high_risk",
  "ml_result": { "available": true, "prediction": "phishing", "confidence": 0.87 },
  "findings": [...],
  "reasons": [...],
  "recommended_actions": [...],
  "limitations": [...]
}
```

### GET /api/v1/health
Returns backend and model availability status.

### GET /api/v1/model-status
Returns ML model details and limitations.

---

## Scoring Policy

The risk score (0–100) is computed as follows:

1. **Rule contributions** are summed and capped at 80 points.
2. **ML bonus**: if the model predicts phishing, adds up to 20 points weighted by model confidence.
3. **Final score** = min(100, rule_score + ml_bonus)

**Thresholds:**
| Score | Category |
|-------|----------|
| 0–34  | Safe |
| 35–64 | Suspicious |
| 65–100 | High Risk |

> This score is a **heuristic indicator**, not a calibrated probability of phishing.

---

## ML Model

- **Algorithm:** Random Forest (200 trees, depth 12)
- **Features:** 29 URL-structure features (length, subdomains, TLD, brand patterns, etc.)
- **Training data:** Synthetic dataset (4,000 phishing + 4,000 legitimate samples)
- **Dataset provenance:** Feature distributions derived from published PhishTank + Tranco research

### Limitations
- Trained on **synthetic data** — suitable for demonstration only
- Does not analyse page content, SSL certificates, or WHOIS data
- No real-time threat intelligence integration
- May not detect new phishing patterns
- Model accuracy is not validated against real-world phishing URLs

For production deployment, train on actual labelled data from:
- [PhishTank API](https://www.phishtank.com/api_info.php) (free)
- [OpenPhish](https://openphish.com/) (free tier)
- [UCI ML Repository — Phishing Websites Dataset](https://archive.ics.uci.edu/dataset/327/phishing+websites)

---

## Security Notes

- The submitted URL is **never visited** by the backend or extension
- No page content is fetched or executed
- No browsing history is accessed
- No scan history is stored
- CORS is restricted to configured origins
- Extension uses minimal permissions (tabs only)

---

## Design System

| Token | Value |
|-------|-------|
| Midnight Navy | `#101827` |
| Dark Slate Blue | `#1A2938` |
| Electric Cyan | `#08C5DF` |
| Soft White | `#F1F5F9` |
| Success | `#22C55E` |
| Warning | `#F59E0B` |
| Danger | `#EF4444` |

---

## Known Limitations

1. The ML model is trained on synthetic data and should not be used for real phishing detection decisions.
2. Brand spoofing detection uses a limited list of ~25 known brands.
3. No network-level checks (WHOIS, DNS, SSL certificate validation) are performed.
4. Analysis is URL-structure only — a malicious page with a clean-looking URL will not be detected.
5. The extension is not published to the Chrome Web Store — load unpacked only.
6. The dashboard requires a locally running backend.
