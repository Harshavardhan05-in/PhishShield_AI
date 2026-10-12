import React, { useState } from 'react'

/**
 * URL input and submit form.
 * Validates input before calling onSubmit.
 * Never navigates to the submitted URL.
 */
export default function URLScanner({ onSubmit, isLoading = false, initialUrl = '' }) {
  const [url, setUrl] = useState(initialUrl)
  const [error, setError] = useState('')

  function validateUrl(value) {
    const trimmed = value.trim()
    if (!trimmed) return 'Please enter a URL to scan.'

    if (/\s/.test(trimmed)) {
      return 'URLs cannot contain whitespace.'
    }

    // Allow missing scheme — backend handles it
    let testUrl = trimmed
    if (!/^https?:\/\//i.test(testUrl)) {
      testUrl = 'http://' + testUrl
    }

    try {
      const parsed = new URL(testUrl)
      if (!parsed.hostname || parsed.hostname.length < 2 || parsed.hostname.startsWith('.') || parsed.hostname.endsWith('.')) {
        return 'The URL does not appear to have a valid hostname.'
      }
    } catch {
      return 'This does not look like a valid URL. Please check and try again.'
    }

    if (trimmed.length > 2048) {
      return 'URL is too long (maximum 2048 characters).'
    }

    return ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    const validationError = validateUrl(url)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    onSubmit(url.trim())
  }

  function handleChange(e) {
    setUrl(e.target.value)
    if (error) setError('')
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="URL scanner form">
      <div className="space-y-3">
        <div>
          <label htmlFor="url-input" className="block text-sm font-medium text-slate-secondary mb-2">
            Enter a URL to analyse
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-muted pointer-events-none" aria-hidden="true">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </span>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={handleChange}
              placeholder="https://suspicious-site.example.com/login"
              className={`input-field pl-10 ${error ? 'border-risk-danger focus:border-risk-danger focus:ring-risk-danger' : ''}`}
              aria-describedby={error ? 'url-error' : 'url-hint'}
              aria-invalid={!!error}
              disabled={isLoading}
              autoComplete="off"
              spellCheck="false"
              autoCapitalize="none"
            />
          </div>
          {error ? (
            <p id="url-error" className="mt-2 text-sm text-risk-danger flex items-center gap-1.5" role="alert">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          ) : (
            <p id="url-hint" className="mt-1.5 text-xs text-slate-muted">
              The URL is analysed without being visited. No page content is fetched.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2"
          aria-label={isLoading ? 'Scanning in progress' : 'Scan URL for phishing indicators'}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analysing…
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Scan URL
            </>
          )}
        </button>
      </div>
    </form>
  )
}
