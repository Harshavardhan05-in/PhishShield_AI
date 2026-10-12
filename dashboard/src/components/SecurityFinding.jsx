import React, { useState } from 'react'

const SEVERITY_CONFIG = {
  critical: { color: 'text-risk-danger', bg: 'bg-risk-danger/10', border: 'border-risk-danger/30', dot: 'bg-risk-danger', label: 'Critical' },
  high:     { color: 'text-risk-danger', bg: 'bg-risk-danger/8',  border: 'border-risk-danger/20', dot: 'bg-risk-danger',   label: 'High' },
  medium:   { color: 'text-risk-warning', bg: 'bg-risk-warning/10', border: 'border-risk-warning/30', dot: 'bg-risk-warning', label: 'Medium' },
  low:      { color: 'text-cyan-brand', bg: 'bg-cyan-brand/8', border: 'border-cyan-brand/20', dot: 'bg-cyan-brand', label: 'Low' },
  info:     { color: 'text-slate-secondary', bg: 'bg-slate-border/30', border: 'border-slate-border', dot: 'bg-slate-muted', label: 'Info' },
}

/**
 * Triggered security finding card.
 * Shows rule_id, title, severity badge, score_contribution, evidence, explanation, recommendation.
 * score_contribution is displayed only when triggered (i.e. when it is verifiably > 0).
 */
function TriggeredFinding({ finding }) {
  const { rule_id, title, severity, evidence, explanation, recommendation, score_contribution } = finding
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info
  const hasEvidence = typeof evidence === 'string' && evidence.trim().length > 0
  const hasScoreContribution = typeof score_contribution === 'number' && score_contribution > 0

  return (
    <article
      className={`rounded-lg border p-4 ${config.bg} ${config.border} animate-slide-up`}
      aria-label={`Security finding: ${title || rule_id || 'Unknown'}`}
    >
      <div className="flex items-start gap-3">
        {/* Severity dot + rule id */}
        <div className="flex-shrink-0 mt-0.5 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${config.dot}`} aria-hidden="true" />
          <span className={`text-xs font-mono font-medium ${config.color} opacity-60`}>{rule_id}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className={`font-semibold text-sm ${config.color}`}>{title}</h4>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Score contribution badge — only when triggered and > 0 */}
              {hasScoreContribution && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded border ${config.bg} ${config.border} ${config.color} font-mono`}
                  title="Heuristic score contribution for this rule (not a probability)"
                  aria-label={`Score contribution: +${score_contribution}`}
                >
                  +{score_contribution}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full border ${config.bg} ${config.border} ${config.color} font-medium`}>
                {config.label}
              </span>
            </div>
          </div>

          {/* Evidence */}
          {hasEvidence && (
            <div className="mb-2 bg-navy-dark/60 rounded px-3 py-1.5 font-mono text-xs text-slate-secondary border border-slate-border/50 break-all">
              {evidence.trim()}
            </div>
          )}

          {/* Explanation */}
          {explanation && (
            <p className="text-slate-secondary text-sm leading-relaxed mb-2">{explanation}</p>
          )}

          {/* Recommendation */}
          {recommendation && (
            <div className="flex items-start gap-1.5 text-xs text-slate-muted">
              <svg className="flex-shrink-0 mt-0.5" width="12" height="12" fill="none" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" fill="currentColor" opacity="0.6"/>
                <path d="M6.5 7.75A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
              </svg>
              <span>{recommendation}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

/**
 * Compact row for an untriggered (passed) security check.
 * Shows what was checked and confirmed clear. Expandable to show the full explanation.
 */
function PassedFinding({ finding }) {
  const [open, setOpen] = useState(false)
  const { rule_id, title, evidence, explanation } = finding
  const hasEvidence = typeof evidence === 'string' && evidence.trim().length > 0

  return (
    <div className="rounded border border-slate-border/40 bg-navy/30 px-3 py-2">
      <button
        type="button"
        className="w-full flex items-center gap-2 text-left group"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {/* Green check */}
        <svg className="flex-shrink-0 text-risk-safe" width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
        </svg>
        <span className="flex-1 text-xs text-slate-muted font-medium">
          <span className="font-mono text-slate-muted/60 mr-1">{rule_id}</span>
          {title} — not detected
        </span>
        {/* Expand chevron */}
        <svg
          className={`flex-shrink-0 text-slate-muted/50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </button>
      {open && (
        <div className="mt-2 text-xs text-slate-muted/80 leading-relaxed pl-5 border-t border-slate-border/30 pt-2 space-y-1">
          {hasEvidence && (
            <div className="font-mono text-slate-secondary">{evidence.trim()}</div>
          )}
          {explanation && <p>{explanation}</p>}
        </div>
      )}
    </div>
  )
}

/**
 * Public export — renders either a triggered finding card or a passed check row.
 * Callers can use `showPassed` prop to control whether untriggered findings are shown.
 */
export default function SecurityFinding({ finding, showPassed = false }) {
  if (!finding || typeof finding !== 'object') return null
  if (finding.triggered) {
    return <TriggeredFinding finding={finding} />
  }
  if (showPassed) {
    return <PassedFinding finding={finding} />
  }
  return null
}
