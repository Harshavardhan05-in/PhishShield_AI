import React, { useState } from 'react'

const BADGE_CONFIG = {
  safe: {
    label: 'Safe',
    cls: 'bg-risk-safe/10 text-risk-safe border-risk-safe/30',
    dot: 'bg-risk-safe',
  },
  suspicious: {
    label: 'Suspicious',
    cls: 'bg-risk-warning/10 text-risk-warning border-risk-warning/30',
    dot: 'bg-risk-warning',
  },
  high_risk: {
    label: 'High Risk',
    cls: 'bg-risk-danger/10 text-risk-danger border-risk-danger/30',
    dot: 'bg-risk-danger',
  },
}

function formatTimestamp(isoString) {
  if (!isoString || typeof isoString !== 'string') return 'Unknown time'
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return 'Unknown time'
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Recent Scan History component (Feature 2).
 * Displays up to 10 saved scans, lets users reopen a saved report without
 * rescanning or visiting the URL, and provides a 2-step Clear History confirmation.
 */
export default function RecentScans({
  entries = [],
  onSelectEntry,
  onClearHistory,
  activeEntryId = null,
}) {
  const [confirmingClear, setConfirmingClear] = useState(false)
  const safeEntries = Array.isArray(entries) ? entries.filter(Boolean) : []

  function handleConfirmClear() {
    setConfirmingClear(false)
    if (typeof onClearHistory === 'function') {
      onClearHistory()
    }
  }

  return (
    <section className="card" aria-label="Recent scan history">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2.5">
          <svg
            className="text-cyan-brand flex-shrink-0"
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
            />
          </svg>
          <h2 className="text-sm font-semibold text-slate-soft uppercase tracking-wider">
            Recent Scans
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-navy-dark border border-slate-border text-slate-muted font-mono">
            {safeEntries.length} / 10
          </span>
        </div>

        {safeEntries.length > 0 && !confirmingClear && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="text-xs text-slate-muted hover:text-risk-danger border border-slate-border hover:border-risk-danger/40 rounded-lg px-3 py-1.5 transition-colors"
            aria-label="Clear recent scan history"
          >
            Clear History
          </button>
        )}

        {safeEntries.length > 0 && confirmingClear && (
          <div
            className="flex items-center gap-2 bg-navy-dark/90 border border-risk-danger/40 rounded-lg px-3 py-1.5"
            role="alert"
            aria-live="polite"
          >
            <span className="text-xs text-slate-secondary">Clear all saved scans?</span>
            <button
              type="button"
              onClick={handleConfirmClear}
              className="text-xs font-semibold px-2.5 py-1 rounded bg-risk-danger text-white hover:bg-risk-danger/90 transition-colors"
              aria-label="Confirm clear scan history"
            >
              Confirm Clear
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="text-xs text-slate-muted hover:text-slate-soft px-2 py-1 rounded border border-slate-border transition-colors"
              aria-label="Cancel clear scan history"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {safeEntries.length === 0 ? (
        <div className="rounded-lg border border-slate-border/50 bg-navy/40 px-4 py-6 text-center">
          <p className="text-slate-secondary text-sm font-medium mb-1">
            No recent scans saved yet
          </p>
          <p className="text-slate-muted text-xs">
            Completed scans are stored locally on your device (up to 10 entries, sensitive query parameters stripped).
          </p>
        </div>
      ) : (
        <ul className="space-y-2" role="list">
          {safeEntries.map((entry) => {
            const badge = BADGE_CONFIG[entry.risk_category] || BADGE_CONFIG.safe
            const isSelected = activeEntryId && entry.id === activeEntryId
            const triggeredCount = Array.isArray(entry.report?.triggered_findings)
              ? entry.report.triggered_findings.length
              : null

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => typeof onSelectEntry === 'function' && onSelectEntry(entry)}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-all duration-150 flex items-center justify-between gap-3 flex-wrap group ${
                    isSelected
                      ? 'bg-cyan-brand/10 border-cyan-brand/50'
                      : 'bg-navy/50 border-slate-border/60 hover:border-cyan-brand/40 hover:bg-navy/80'
                  }`}
                  aria-label={`View saved scan report for ${entry.display_url}, risk score ${entry.risk_score}, ${badge.label}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${badge.dot}`} aria-hidden="true" />
                      <span className="font-mono text-xs sm:text-sm text-cyan-brand truncate block group-hover:underline">
                        {entry.display_url}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-muted flex-wrap">
                      <span>Scanned {formatTimestamp(entry.scanned_at)}</span>
                      {triggeredCount !== null && (
                        <span>
                          • {triggeredCount} indicator{triggeredCount === 1 ? '' : 's'} triggered
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="font-mono text-xs text-slate-secondary bg-navy-dark/80 border border-slate-border/60 px-2 py-1 rounded">
                      {entry.risk_score}<span className="text-slate-muted">/100</span>
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-cyan-brand font-medium hidden sm:inline">
                      View Report →
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
