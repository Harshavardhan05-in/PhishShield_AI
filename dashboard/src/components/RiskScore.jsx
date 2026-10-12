import React from 'react'

const CATEGORY_CONFIG = {
  safe: {
    label: 'Safe',
    color: '#22C55E',
    bgClass: 'bg-risk-safe/10',
    borderClass: 'border-risk-safe/30',
    textClass: 'text-risk-safe',
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  suspicious: {
    label: 'Suspicious',
    color: '#F59E0B',
    bgClass: 'bg-risk-warning/10',
    borderClass: 'border-risk-warning/30',
    textClass: 'text-risk-warning',
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  high_risk: {
    label: 'High Risk',
    color: '#EF4444',
    bgClass: 'bg-risk-danger/10',
    borderClass: 'border-risk-danger/30',
    textClass: 'text-risk-danger',
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    ),
  },
}

/**
 * Circular risk score display with animated ring.
 */
export default function RiskScore({ score, category }) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.safe
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score ring */}
      <div className="relative inline-flex items-center justify-center" aria-hidden="true">
        <svg width="130" height="130" viewBox="0 0 130 130">
          {/* Track */}
          <circle
            cx="65" cy="65" r={radius}
            fill="none"
            stroke="#2B3B4F"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="65" cy="65" r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 65 65)"
            className="score-ring-path transition-all duration-1000"
            style={{ '--target-offset': offset }}
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${config.textClass}`}>{score}</span>
          <span className="text-slate-muted text-xs font-medium">/ 100</span>
        </div>
      </div>

      {/* Category badge */}
      <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border ${config.bgClass} ${config.borderClass} ${config.textClass} font-semibold text-sm`}>
        {config.icon}
        {config.label}
      </div>

      <p className="text-slate-muted text-xs text-center max-w-[180px] leading-relaxed">
        Heuristic risk score — not a calibrated probability
      </p>
    </div>
  )
}
