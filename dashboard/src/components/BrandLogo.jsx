import React from 'react'

/**
 * PhishShield AI Shield Logo SVG component.
 * Used in both the intro animation and navigation.
 */
export default function BrandLogo({ size = 40, animated = false, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PhishShield AI shield logo"
      className={className}
    >
      {/* Shield body */}
      <path
        d="M32 4L8 14v18c0 13.2 10.4 25.6 24 29 13.6-3.4 24-15.8 24-29V14L32 4z"
        fill="#08C5DF"
        fillOpacity="0.12"
        stroke="#08C5DF"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Lock body */}
      <rect x="24" y="28" width="16" height="12" rx="2" fill="#08C5DF" fillOpacity="0.8" />
      {/* Lock shackle */}
      <path
        d="M27 28v-3a5 5 0 0 1 10 0v3"
        stroke="#08C5DF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Keyhole */}
      <circle cx="32" cy="33" r="1.5" fill="#101827" />
      <rect x="31" y="33" width="2" height="3" rx="1" fill="#101827" />
    </svg>
  )
}
