import React from 'react'
import BrandLogo from './BrandLogo'

/**
 * Full-screen loading state shown while backend analysis is running.
 */
export default function ScanLoadingState({ url }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] py-16"
      role="status"
      aria-label="Analysing URL, please wait"
      aria-live="polite"
    >
      {/* Animated shield */}
      <div className="relative mb-8">
        <BrandLogo size={64} />
        {/* Pulsing rings */}
        <span className="absolute inset-0 rounded-full border-2 border-cyan-brand/30 animate-ping" aria-hidden="true" />
        <span className="absolute -inset-4 rounded-full border border-cyan-brand/15 animate-ping [animation-delay:0.3s]" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-semibold text-slate-soft mb-2">Analysing URL</h2>
      <p className="text-slate-muted text-sm mb-6 text-center max-w-xs">
        Running security rule checks and ML inference…
      </p>

      {/* URL display */}
      {url && (
        <div className="bg-navy-dark border border-slate-border rounded-lg px-4 py-2 max-w-lg w-full mx-4">
          <p className="text-slate-muted text-xs mb-1">Scanning</p>
          <p className="text-cyan-brand font-mono text-sm break-all line-clamp-2" title={url}>
            {url}
          </p>
        </div>
      )}

      {/* Progress steps */}
      <div className="mt-8 space-y-2 text-left w-full max-w-xs">
        {[
          { label: 'Extracting URL features', delay: '0s' },
          { label: 'Running security rule checks', delay: '0.4s' },
          { label: 'Running ML inference', delay: '0.8s' },
          { label: 'Aggregating risk score', delay: '1.2s' },
        ].map(({ label, delay }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 text-slate-muted text-xs animate-fade-in opacity-0"
            style={{ animationDelay: delay, animationFillMode: 'both' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-brand animate-pulse" aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
