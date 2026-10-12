import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo'

export default function Navigation({ showScanButton = true }) {
  const navigate = useNavigate()

  return (
    <nav
      className="sticky top-0 z-50 bg-navy/95 backdrop-blur border-b border-slate-border"
      aria-label="Main navigation"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group focus-visible:outline-cyan-brand"
          aria-label="PhishShield AI home"
        >
          <BrandLogo size={32} />
          <div className="leading-tight">
            <span className="block font-bold text-slate-soft text-base group-hover:text-cyan-brand transition-colors">
              PhishShield
            </span>
            <span className="block text-cyan-brand font-semibold text-xs tracking-widest uppercase">
              AI
            </span>
          </div>
        </Link>

        {/* Nav actions */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-slate-muted text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-risk-safe animate-pulse" aria-hidden="true" />
            Analysis Engine Active
          </span>
          {showScanButton && (
            <button
              onClick={() => navigate('/')}
              className="btn-secondary text-sm py-2 px-4"
              aria-label="Scan another URL"
            >
              + Scan URL
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
