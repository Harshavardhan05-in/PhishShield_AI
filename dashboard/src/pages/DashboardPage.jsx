import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navigation from '../components/Navigation'
import URLScanner from '../components/URLScanner'
import IntroAnimation from '../components/IntroAnimation'
import ScanLoadingState from '../components/ScanLoadingState'
import ErrorState from '../components/ErrorState'
import RiskScore from '../components/RiskScore'
import AnalysisSummary from '../components/AnalysisSummary'
import SecurityFinding from '../components/SecurityFinding'
import RecommendedActions from '../components/RecommendedActions'
import RecentScans from '../components/RecentScans'
import Footer from '../components/Footer'
import { scanUrl } from '../services/api'
import {
  loadScanHistory,
  saveScanToHistory,
  clearScanHistory,
} from '../services/scanHistory'

const SCAN_STATES = {
  INTRO: 'intro',
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
}

/**
 * Validate and normalize a destination URL for safe browsing navigation.
 * Strictly allows only http: and https: protocols.
 * Explicitly rejects javascript:, data:, file:, chrome:, and all other schemes.
 */
export function getSafeBrowsingUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  // Reject unsupported or dangerous explicit schemes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/i)
    const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : ''
    if (scheme !== 'http' && scheme !== 'https') {
      return null
    }
  }

  let candidate = trimmed
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = 'http://' + candidate
  }

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    if (!parsed.hostname || parsed.hostname.length < 1) {
      return null
    }
    return parsed.href
  } catch {
    return null
  }
}

/**
 * Validate that the API scan response contains the minimum required fields
 * for a genuine scan report. Prevents malformed payloads from crashing the UI
 * or fabricating a successful scan.
 */
export function isValidScanResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  if (typeof data.risk_score !== 'number' || Number.isNaN(data.risk_score)) return false
  if (data.risk_score < 0 || data.risk_score > 100) return false
  if (!['safe', 'suspicious', 'high_risk'].includes(data.risk_category)) return false
  return true
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [scanState, setScanState] = useState(SCAN_STATES.INTRO)
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState(() => loadScanHistory())
  const [isSavedReport, setIsSavedReport] = useState(false)
  const [activeHistoryId, setActiveHistoryId] = useState(null)
  const scanRef = useRef(null)
  const hasScannedRef = useRef(false)

  // Read URL from query params (passed from extension or previous navigation)
  const pendingUrl = (searchParams.get('url') || '').trim()

  const handleIntroComplete = useCallback(() => {
    // After intro, move to idle or start scan if URL was passed
    if (pendingUrl && !hasScannedRef.current) {
      setScanState(SCAN_STATES.LOADING)
      setUrl(pendingUrl)
      hasScannedRef.current = true
      performScan(pendingUrl)
    } else {
      setScanState(SCAN_STATES.IDLE)
    }
  }, [pendingUrl])

  async function performScan(targetUrl) {
    // Cancel any previous in-flight scan
    if (scanRef.current) {
      scanRef.current.cancelled = true
    }
    const token = { cancelled: false }
    scanRef.current = token

    setScanState(SCAN_STATES.LOADING)
    setError(null)
    setResult(null)
    setIsSavedReport(false)
    setActiveHistoryId(null)

    try {
      const data = await scanUrl(targetUrl)
      if (!isValidScanResponse(data)) {
        throw new Error('Received a malformed scan response from the server.')
      }
      if (!token.cancelled) {
        setResult(data)
        setScanState(SCAN_STATES.SUCCESS)
        const updatedHistory = saveScanToHistory(data)
        setHistory(updatedHistory)
        setActiveHistoryId(data.scan_id || null)
      }
    } catch (err) {
      if (!token.cancelled) {
        setError(err)
        setScanState(SCAN_STATES.ERROR)
      }
    }
  }

  function handleScanSubmit(submittedUrl) {
    setUrl(submittedUrl)
    hasScannedRef.current = true
    performScan(submittedUrl)
  }

  function handleRetry() {
    if (url) performScan(url)
  }

  function handleSelectHistoryEntry(entry) {
    if (!entry || !entry.report || !isValidScanResponse(entry.report)) return
    if (scanRef.current) {
      scanRef.current.cancelled = true
    }
    setError(null)
    setUrl(entry.display_url)
    setResult(entry.report)
    setIsSavedReport(true)
    setActiveHistoryId(entry.id)
    setScanState(SCAN_STATES.SUCCESS)
  }

  function handleClearHistory() {
    const cleared = clearScanHistory()
    setHistory(cleared)
    setActiveHistoryId(null)
  }

  function handleContinueBrowsing() {
    // Reuse original URL stored in the existing scan flow
    const targetUrl = getSafeBrowsingUrl(url || result?.url)
    if (targetUrl) {
      window.location.href = targetUrl
    } else {
      console.warn('Destination URL scheme is not supported for safe navigation.')
    }
  }

  const extId = (searchParams.get('extId') || '').trim()

  function handleGoToHomePage() {
    // Standard web APIs cannot read browser homepage.
    // Where supported, delegate to the extension background service worker.
    const targetExtId = extId || (typeof window !== 'undefined' && window.chrome?.runtime?.id)
    if (typeof window !== 'undefined' && window.chrome?.runtime?.sendMessage && targetExtId) {
      try {
        window.chrome.runtime.sendMessage(targetExtId, { action: 'OPEN_HOMEPAGE' }, (response) => {
          if (window.chrome.runtime.lastError || !response?.success) {
            // Documented safe fallback: navigate current report tab away
            window.location.href = 'about:blank'
          }
        })
        return
      } catch {
        // Fallback below
      }
    }
    // Documented safe fallback: navigate current tab away to blank
    window.location.href = 'about:blank'
  }

  function handleScanAnother() {
    setResult(null)
    setError(null)
    setUrl('')
    setIsSavedReport(false)
    setActiveHistoryId(null)
    hasScannedRef.current = false
    setScanState(SCAN_STATES.IDLE)
    // Clear url param from address bar
    navigate('/dashboard', { replace: true })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (scanState === SCAN_STATES.INTRO) {
    return <IntroAnimation onComplete={handleIntroComplete} />
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navigation showScanButton={scanState === SCAN_STATES.SUCCESS} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* ── IDLE: Scanner form ── */}
        {scanState === SCAN_STATES.IDLE && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            {/* Hero */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 bg-cyan-brand/10 border border-cyan-brand/20 text-cyan-brand text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-brand" aria-hidden="true" />
                Phishing URL Analyser
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-soft mb-3 leading-tight">
                Is this URL <span className="text-cyan-brand">safe?</span>
              </h1>
              <p className="text-slate-muted text-base leading-relaxed">
                PhishShield AI analyses URL structure using security heuristics and
                machine learning — without visiting the page.
              </p>
            </div>

            {/* Scanner card */}
            <div className="card">
              <URLScanner onSubmit={handleScanSubmit} />
            </div>

            {/* Feature hints */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '🔍', title: '12 Security Rules', desc: 'Deterministic checks with evidence' },
                { icon: '🤖', title: 'ML Prediction', desc: 'Random Forest URL classifier' },
                { icon: '📋', title: 'Explainable Results', desc: 'Understand exactly why' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-navy-slate/50 border border-slate-border rounded-lg p-4 text-center">
                  <span className="text-2xl mb-2 block" aria-hidden="true">{icon}</span>
                  <p className="text-slate-soft text-sm font-semibold">{title}</p>
                  <p className="text-slate-muted text-xs mt-1">{desc}</p>
                </div>
              ))}
            </div>

            {/* Recent Scan History */}
            <div className="mt-8">
              <RecentScans
                entries={history}
                onSelectEntry={handleSelectHistoryEntry}
                onClearHistory={handleClearHistory}
                activeEntryId={activeHistoryId}
              />
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {scanState === SCAN_STATES.LOADING && (
          <ScanLoadingState url={url} />
        )}

        {/* ── ERROR ── */}
        {scanState === SCAN_STATES.ERROR && (
          <ErrorState error={error} onRetry={handleRetry} url={url} />
        )}

        {/* ── SUCCESS: Full report ── */}
        {scanState === SCAN_STATES.SUCCESS && result && (
          <div className="animate-fade-in space-y-6">
            {/* Saved Report Notice Banner (when viewing an item from Recent Scans) */}
            {isSavedReport && (
              <div
                className="rounded-xl border border-cyan-brand/30 bg-cyan-brand/5 px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                role="status"
              >
                <div className="flex items-start gap-2.5 text-xs text-slate-secondary">
                  <svg
                    className="text-cyan-brand flex-shrink-0 mt-0.5"
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                  </svg>
                  <div>
                    <span className="font-semibold text-cyan-brand mr-1.5">Saved Scan Report</span>
                    <span>
                      Originally scanned at{' '}
                      <span className="font-mono text-slate-soft">
                        {result.scanned_at
                          ? new Date(result.scanned_at).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'an earlier time'}
                      </span>
                      . Viewing stored snapshot — this URL was not re-scanned and current safety is not guaranteed.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Scanned URL */}
            <div className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-muted mb-1 uppercase tracking-wider font-medium">Analysed URL</p>
                  <p className="font-mono text-cyan-brand text-sm break-all" title={result.url}>
                    {result.url}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
                  {/* Result-dependent navigation action button */}
                  {result.risk_category === 'safe' ? (
                    <button
                      onClick={handleContinueBrowsing}
                      className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5"
                      aria-label="Continue browsing to the scanned URL"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      Continue Browsing
                    </button>
                  ) : (
                    <button
                      onClick={handleGoToHomePage}
                      className={`btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5 ${
                        result.risk_category === 'high_risk'
                          ? 'bg-risk-danger hover:bg-risk-danger/90 text-white'
                          : ''
                      }`}
                      aria-label="Go to browser home page"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                      </svg>
                      Go to Browser Home Page
                    </button>
                  )}
                  <button
                    onClick={handleScanAnother}
                    className="btn-secondary text-sm py-2 px-4 flex-shrink-0"
                    aria-label="Scan another URL"
                  >
                    + Scan Another
                  </button>
                </div>
              </div>
            </div>

            {/* Main result grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Score + Recommendations */}
              <div className="space-y-5">
                {/* Risk score */}
                <div className="card flex flex-col items-center">
                  <RiskScore
                    score={result.risk_score}
                    category={result.risk_category}
                  />
                </div>

                {/* Recommended actions */}
                <RecommendedActions
                  actions={result.recommended_actions}
                  category={result.risk_category}
                />
              </div>

              {/* Right: Analysis summary + findings */}
              <div className="lg:col-span-2 space-y-5">
                <AnalysisSummary result={result} />

                {/* Security findings */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-secondary uppercase tracking-wider">
                      Security Findings
                    </h3>
                    <span className="text-xs text-slate-muted">
                      {Array.isArray(result.triggered_findings) ? result.triggered_findings.length : 0} triggered / {Array.isArray(result.findings) ? result.findings.length : 0} checks
                    </span>
                  </div>

                  {Array.isArray(result.triggered_findings) && result.triggered_findings.length > 0 ? (
                    <div className="space-y-3">
                      {result.triggered_findings.filter(Boolean).map((f, idx) => (
                        <SecurityFinding key={f.rule_id || idx} finding={f} />
                      ))}
                    </div>
                  ) : (
                    <div className="card text-center py-8">
                      <p className="text-risk-safe font-semibold mb-1">No indicators triggered</p>
                      <p className="text-slate-muted text-sm">
                        None of the 12 security rules detected suspicious patterns in this URL.
                        This does not guarantee the URL is safe.
                      </p>
                    </div>
                  )}

                  {/* Collapsible "Checks Passed" panel — shows untriggered (cleared) findings */}
                  {Array.isArray(result.findings) && result.findings.some(f => f && !f.triggered) && (
                    <details className="mt-4 rounded-lg border border-slate-border/40 bg-navy/20">
                      <summary className="px-4 py-2.5 text-xs font-semibold text-slate-muted uppercase tracking-wider list-none flex items-center gap-2 cursor-pointer select-none">
                        <svg className="text-risk-safe flex-shrink-0" width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
                        </svg>
                        {result.findings.filter(f => f && !f.triggered).length} checks passed
                        <svg className="ml-auto text-slate-muted/50" width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
                        </svg>
                      </summary>
                      <div className="px-3 pb-3 pt-1 space-y-1.5">
                        {result.findings.filter(f => f && !f.triggered).map((f, idx) => (
                          <SecurityFinding key={f.rule_id || idx} finding={f} showPassed={true} />
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                {/* Limitations disclosure */}
                {Array.isArray(result.limitations) && result.limitations.length > 0 && (
                  <details className="card cursor-pointer">
                    <summary className="text-xs font-semibold text-slate-muted uppercase tracking-wider list-none flex items-center gap-2">
                      <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                      </svg>
                      Analysis Limitations
                    </summary>
                    <ul className="mt-3 space-y-1.5">
                      {result.limitations.map((lim, i) => (
                        <li key={i} className="text-xs text-slate-muted flex items-start gap-2">
                          <span className="flex-shrink-0 mt-0.5" aria-hidden="true">•</span>
                          {lim}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>

            {/* Recent Scan History */}
            <RecentScans
              entries={history}
              onSelectEntry={handleSelectHistoryEntry}
              onClearHistory={handleClearHistory}
              activeEntryId={activeHistoryId}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
