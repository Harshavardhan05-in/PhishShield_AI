import React from 'react'

/**
 * Summary section: ML result + analysis method + key reasons.
 */
export default function AnalysisSummary({ result }) {
  if (!result || typeof result !== 'object') return null

  const { ml_result, reasons, analysis_method, scanned_at, scan_id } = result
  const mlAvailable = Boolean(ml_result?.available && ml_result?.prediction)

  const scannedTime = scanned_at
    ? new Date(scanned_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  return (
    <div className="space-y-4">
      {/* ML Result Card */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-secondary uppercase tracking-wider mb-3">
          Machine Learning Analysis
        </h3>
        {mlAvailable ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-muted text-sm">Prediction</span>
              <span className={`font-semibold text-sm ${
                ml_result.prediction === 'phishing'
                  ? 'text-risk-danger'
                  : ml_result.prediction === 'legitimate'
                    ? 'text-risk-safe'
                    : 'text-slate-secondary'
              }`}>
                {ml_result.prediction === 'phishing'
                  ? '⚠ Phishing'
                  : ml_result.prediction === 'legitimate'
                    ? '✓ Legitimate'
                    : String(ml_result.prediction)}
              </span>
            </div>
            {typeof ml_result.confidence === 'number' && !Number.isNaN(ml_result.confidence) && (
              <div className="flex items-center justify-between">
                <span className="text-slate-muted text-sm">Model confidence</span>
                <span className="text-slate-secondary text-sm font-mono">
                  {(ml_result.confidence * 100).toFixed(1)}%
                </span>
              </div>
            )}
            {ml_result.model_version && (
              <div className="flex items-center justify-between">
                <span className="text-slate-muted text-sm">Model version</span>
                <span className="text-slate-secondary text-xs font-mono">{ml_result.model_version}</span>
              </div>
            )}
            {ml_result.note && (
              <p className="text-xs text-slate-muted italic border-t border-slate-border pt-2 mt-2">
                {ml_result.note}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2.5 text-slate-muted text-sm">
            <svg className="flex-shrink-0 mt-0.5" width="16" height="16" fill="none" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" fill="#94A3B8"/>
            </svg>
            <div>
              <p className="font-medium text-slate-secondary">ML model not loaded</p>
              <p className="text-xs mt-0.5">
                {ml_result?.note || 'Analysis is based on heuristic security rules only.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Why this result */}
      {Array.isArray(reasons) && reasons.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-secondary uppercase tracking-wider mb-3">
            Why This Result
          </h3>
          <ul className="space-y-2">
            {reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-secondary">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-cyan-brand/20 border border-cyan-brand/40 flex items-center justify-center text-cyan-brand text-xs font-bold mt-0.5" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analysis metadata */}
      <div className="card bg-navy/50">
        <h3 className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-2">
          Analysis Metadata
        </h3>
        <div className="space-y-1 text-xs text-slate-muted">
          <div className="flex justify-between">
            <span>Method</span>
            <span className="text-slate-secondary text-right max-w-[200px]">
              {analysis_method || 'Heuristic security rules'}
            </span>
          </div>
          {scannedTime && (
            <div className="flex justify-between">
              <span>Scanned at</span>
              <span className="text-slate-secondary">{scannedTime}</span>
            </div>
          )}
          {scan_id && (
            <div className="flex justify-between">
              <span>Scan ID</span>
              <span className="font-mono text-slate-secondary truncate max-w-[150px]">{String(scan_id).slice(0, 12)}…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
