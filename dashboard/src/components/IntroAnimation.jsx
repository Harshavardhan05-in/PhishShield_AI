import React, { useEffect, useState } from 'react'
import BrandLogo from './BrandLogo'

/**
 * Two-second branded intro animation for the dashboard.
 *
 * States:
 *   0 → shield-reveal (0–0.6s)
 *   1 → scan-ring + brand name (0.6–1.4s)
 *   2 → done — calls onComplete
 *
 * Respects prefers-reduced-motion: skips immediately if set.
 * Does NOT block backend requests from starting.
 */
export default function IntroAnimation({ onComplete }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    // Skip animation if user prefers reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      onComplete()
      return
    }

    // Phase 0 → 1: after shield reveal (600ms)
    const t1 = setTimeout(() => setPhase(1), 600)
    // Phase 1 → done: after scan ring + brand (total 2000ms)
    const t2 = setTimeout(() => {
      setPhase(2)
      onComplete()
    }, 2000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 z-50 bg-navy flex flex-col items-center justify-center"
      role="status"
      aria-label="PhishShield AI loading"
      aria-live="polite"
    >
      {/* Shield + scan ring */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Scan ring */}
        {phase >= 1 && (
          <>
            <span
              className="absolute w-32 h-32 rounded-full border-2 border-cyan-brand/60 intro-scan-ring"
              aria-hidden="true"
            />
            <span
              className="absolute w-48 h-48 rounded-full border border-cyan-brand/20 intro-scan-ring [animation-delay:0.2s]"
              aria-hidden="true"
            />
          </>
        )}

        {/* Shield logo */}
        <div className={phase === 0 ? 'intro-shield' : 'intro-shield'}>
          <BrandLogo size={72} />
        </div>
      </div>

      {/* Brand name */}
      {phase >= 1 && (
        <div className="text-center intro-brand">
          <h1 className="text-2xl font-bold text-slate-soft tracking-tight">
            Phish<span className="text-cyan-brand">Shield</span>
          </h1>
          <p className="text-cyan-brand text-sm font-semibold tracking-[0.3em] uppercase mt-1">
            AI
          </p>
          <p className="text-slate-muted text-sm mt-3">
            Your personal phishing guard
          </p>
        </div>
      )}

      {/* Thin cyan loading bar at bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-0.5 bg-slate-border overflow-hidden" aria-hidden="true">
        <div
          className="h-full bg-cyan-brand transition-all duration-[2000ms] ease-linear"
          style={{ width: phase >= 1 ? '100%' : '30%' }}
        />
      </div>
    </div>
  )
}
