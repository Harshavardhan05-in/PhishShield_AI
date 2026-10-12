import React from 'react'

const ACTION_ICONS = {
  high_risk: (
    <svg className="flex-shrink-0 mt-0.5" width="16" height="16" fill="none" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" fill="#EF4444" />
    </svg>
  ),
  suspicious: (
    <svg className="flex-shrink-0 mt-0.5" width="16" height="16" fill="none" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" fill="#F59E0B" />
    </svg>
  ),
  safe: (
    <svg className="flex-shrink-0 mt-0.5" width="16" height="16" fill="none" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" fill="#22C55E" />
    </svg>
  ),
}

/**
 * Recommended next steps panel, tailored to risk category.
 */
export default function RecommendedActions({ actions, category }) {
  const safeActions = Array.isArray(actions) ? actions.filter(Boolean) : []
  if (safeActions.length === 0) return null

  const icon = ACTION_ICONS[category] || ACTION_ICONS.safe

  const headerConfig = {
    high_risk: { title: 'Immediate Actions Required', cls: 'text-risk-danger border-risk-danger/30 bg-risk-danger/5' },
    suspicious: { title: 'Recommended Actions', cls: 'text-risk-warning border-risk-warning/30 bg-risk-warning/5' },
    safe: { title: 'Recommended Best Practices', cls: 'text-risk-safe border-risk-safe/30 bg-risk-safe/5' },
  }
  const hc = headerConfig[category] || headerConfig.safe

  return (
    <div className={`rounded-xl border p-5 ${hc.cls}`}>
      <h3 className="font-semibold text-sm uppercase tracking-wider mb-4">
        {hc.title}
      </h3>
      <ul className="space-y-3">
        {safeActions.map((action, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-secondary leading-relaxed">
            {icon}
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
