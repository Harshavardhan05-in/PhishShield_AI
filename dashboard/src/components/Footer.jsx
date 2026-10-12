import React from 'react'

export default function Footer() {
  return (
    <footer className="border-t border-slate-border mt-12 py-6 text-center">
      <p className="text-slate-muted text-xs">
        PhishShield AI — URL analysis based on structure only. No page content is fetched or executed.
        <br />
        A clean scan does not guarantee safety. Always verify critical domains through trusted sources.
      </p>
      <p className="text-slate-muted/60 text-xs mt-1">
        Built for demonstration purposes. ML model trained on synthetic data.
      </p>
      <p className="text-slate-muted/70 text-xs mt-2">
        © 2026 PhishShield AI. All rights reserved.
      </p>
    </footer>
  )
}
