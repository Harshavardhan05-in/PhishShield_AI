import React from 'react'

/**
 * Safely parse and format error details into a human-readable string.
 * Never returns an object or array, ensuring it can always be safely rendered in JSX.
 */
function extractReadableErrorMessage(error, defaultMessage) {
  if (!error) return defaultMessage

  const responseData = error.response?.data
  const rawDetail = responseData?.detail ?? responseData?.message ?? responseData?.error

  // Case 1: FastAPI RequestValidationError array (e.g., [{ loc: [...], msg: "...", type: "..." }])
  if (Array.isArray(rawDetail)) {
    const messages = rawDetail
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim()
        }
        if (item && typeof item === 'object') {
          const msg = typeof item.msg === 'string' ? item.msg : (typeof item.message === 'string' ? item.message : null)
          if (msg) {
            // Strip Pydantic's "Value error, " prefix
            return msg.replace(/^Value error,\s*/i, '').trim()
          }
        }
        return null
      })
      .filter(Boolean)

    if (messages.length > 0) {
      return messages.join('. ')
    }
  }

  // Case 2: String detail (e.g. custom HTTPException detail)
  if (typeof rawDetail === 'string' && rawDetail.trim()) {
    return rawDetail.replace(/^Value error,\s*/i, '').trim()
  }

  // Case 3: Object detail (e.g. { message: "...", msg: "..." })
  if (rawDetail && typeof rawDetail === 'object') {
    const msg = rawDetail.msg || rawDetail.message || rawDetail.error
    if (typeof msg === 'string' && msg.trim()) {
      return msg.replace(/^Value error,\s*/i, '').trim()
    }
  }

  // Case 4: Plain string response body
  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData.length > 200 ? defaultMessage : responseData.trim()
  }

  // Case 5: Standard JS/Axios error message
  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim()
  }

  return defaultMessage
}

/**
 * Error state with retry support.
 */
export default function ErrorState({ error, onRetry, url }) {
  const isNetworkError = error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')
  const isTimeout = error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')
  const is422 = error?.response?.status === 422
  const is500 = error?.response?.status >= 500

  let title = 'Analysis Failed'
  let description = 'An unexpected error occurred. Please try again.'
  let hint = null

  const isLocalDev =
    Boolean(import.meta.env.DEV) &&
    (typeof window === 'undefined' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')

  if (isNetworkError || isTimeout) {
    title = 'Backend Unavailable'
    description = 'Could not connect to the PhishShield AI backend.'
    hint = isLocalDev
      ? 'Make sure the FastAPI server is running on port 8000 (uvicorn app.main:app --reload).'
      : 'The analysis service may be waking up or temporarily unreachable. Please wait a moment and click Retry.'
  } else if (is422) {
    title = 'Invalid URL'
    description = extractReadableErrorMessage(error, 'The submitted URL could not be validated. Please check the URL format.')
  } else if (is500) {
    title = 'Server Error'
    description = extractReadableErrorMessage(error, 'The backend encountered an internal error.')
    hint = 'Check the backend logs for details.'
  } else {
    description = extractReadableErrorMessage(error, 'An unexpected error occurred. Please try again.')
  }

  const displayUrl = typeof url === 'string'
    ? url
    : (typeof url === 'object' && url?.url ? String(url.url) : (url ? String(url) : ''))

  return (
    <div
      className="flex flex-col items-center text-center py-12 px-4"
      role="alert"
      aria-live="assertive"
    >
      {/* Error icon */}
      <div className="w-16 h-16 rounded-full bg-risk-danger/10 border border-risk-danger/30 flex items-center justify-center mb-5">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke="#EF4444"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-slate-soft mb-2">{title}</h2>
      <p className="text-slate-muted text-sm max-w-md mb-2">{description}</p>

      {hint && (
        <div className="bg-navy-dark border border-slate-border rounded-lg px-4 py-2.5 mb-6 max-w-md">
          <p className="text-slate-secondary text-xs font-mono text-left">{hint}</p>
        </div>
      )}

      {/* URL that failed */}
      {displayUrl && (
        <div className="mb-6 bg-navy-dark border border-slate-border rounded-lg px-4 py-2 max-w-lg w-full">
          <p className="text-slate-muted text-xs mb-0.5">Failed URL</p>
          <p className="text-slate-secondary font-mono text-xs break-all">{displayUrl}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap justify-center">
        {onRetry && (
          <button onClick={onRetry} className="btn-primary" aria-label="Retry the scan">
            <svg className="mr-1.5 inline" width="14" height="14" fill="none" viewBox="0 0 20 20" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke="currentColor"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retry
          </button>
        )}
        <a href="/dashboard" className="btn-secondary" aria-label="Scan a different URL">
          Scan Another URL
        </a>
      </div>
    </div>
  )
}
