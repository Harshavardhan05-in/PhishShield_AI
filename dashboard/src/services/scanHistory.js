/**
 * PhishShield AI — Local Scan History Service (Feature 2)
 *
 * Responsibilities:
 *   - Store up to 10 completed scan reports locally in localStorage.
 *   - Strip credentials, fragments, and query parameters (including sensitive
 *     tokens, passwords, session IDs, etc.) from stored/displayed URLs.
 *   - Gracefully handle storage failures, corrupted JSON, malformed entries,
 *     and duplicate scans without throwing.
 *   - Never send history to a backend or automatically navigate to any URL.
 */

export const HISTORY_STORAGE_KEY = 'phishshield_recent_scans_v1'
export const MAX_HISTORY_ENTRIES = 10

// In-memory fallback if localStorage is unavailable or blocked
let memoryFallbackStore = []

/**
 * Create a privacy-conscious display URL:
 *   - Strips username and password credentials
 *   - Strips query parameters (prevents storing tokens, session IDs, emails, keys, etc.)
 *   - Strips URL fragments (#...)
 *   - Allows only http: and https: schemes
 */
export function sanitizeUrlForHistory(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return ''
  const trimmed = rawUrl.trim()
  if (!trimmed) return ''

  let candidate = trimmed
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = 'http://' + candidate
  }

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ''
    }
    if (!parsed.hostname) {
      return ''
    }
    // Strip credentials, query strings, and fragments for privacy
    parsed.username = ''
    parsed.password = ''
    parsed.search = ''
    parsed.hash = ''
    return parsed.href
  } catch {
    // Fallback regex sanitization if URL constructor fails on unusual hostname
    const withoutFragment = trimmed.split('#')[0]
    const withoutQuery = withoutFragment.split('?')[0]
    // Strip user:pass@ if present after scheme
    return withoutQuery.replace(/^(https?:\/\/)[^/@]+@/i, '$1')
  }
}

/**
 * Validate a stored history entry so malformed storage data never crashes the UI.
 */
export function isValidHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false
  if (typeof entry.id !== 'string' || !entry.id.trim()) return false
  if (typeof entry.display_url !== 'string' || !entry.display_url.trim()) return false
  if (typeof entry.scanned_at !== 'string' || !entry.scanned_at.trim()) return false
  if (typeof entry.risk_score !== 'number' || Number.isNaN(entry.risk_score)) return false
  if (entry.risk_score < 0 || entry.risk_score > 100) return false
  if (!['safe', 'suspicious', 'high_risk'].includes(entry.risk_category)) return false
  if (!entry.report || typeof entry.report !== 'object' || Array.isArray(entry.report)) return false
  if (typeof entry.report.risk_score !== 'number' || entry.report.risk_category !== entry.risk_category) {
    return false
  }
  return true
}

function getStorage(customStorage) {
  if (customStorage) return customStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    // Access denied (e.g. strict privacy mode)
  }
  return null
}

/**
 * Load and validate saved scan history (up to 10 entries, newest first).
 * Gracefully recovers from corrupted JSON or malformed entries.
 */
export function loadScanHistory(customStorage) {
  const storage = getStorage(customStorage)
  try {
    const raw = storage ? storage.getItem(HISTORY_STORAGE_KEY) : null
    if (!raw) {
      return storage ? [] : [...memoryFallbackStore]
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const validEntries = []
    const seenUrls = new Set()
    for (const item of parsed) {
      if (isValidHistoryEntry(item)) {
        const sanitizedDisplay = sanitizeUrlForHistory(item.display_url)
        if (!sanitizedDisplay) continue
        const key = sanitizedDisplay.toLowerCase()
        if (seenUrls.has(key)) continue
        seenUrls.add(key)

        validEntries.push({
          ...item,
          display_url: sanitizedDisplay,
          report: {
            ...item.report,
            url: sanitizedDisplay,
            normalized_url: sanitizedDisplay,
          },
        })
        if (validEntries.length >= MAX_HISTORY_ENTRIES) break
      }
    }
    return validEntries
  } catch {
    return []
  }
}

/**
 * Save a completed scan result to history.
 * - Deduplicates by privacy-sanitized display_url (most recent scan replaces older entry).
 * - Keeps at most MAX_HISTORY_ENTRIES (10).
 * - Strips credentials and query parameters before persisting.
 */
export function saveScanToHistory(scanResult, customStorage) {
  const existing = loadScanHistory(customStorage)
  if (!scanResult || typeof scanResult !== 'object' || Array.isArray(scanResult)) {
    return existing
  }
  if (typeof scanResult.risk_score !== 'number' || Number.isNaN(scanResult.risk_score)) {
    return existing
  }
  if (scanResult.risk_score < 0 || scanResult.risk_score > 100) {
    return existing
  }
  if (!['safe', 'suspicious', 'high_risk'].includes(scanResult.risk_category)) {
    return existing
  }

  const displayUrl = sanitizeUrlForHistory(scanResult.url || scanResult.normalized_url || '')
  if (!displayUrl) {
    return existing
  }

  const scannedAt =
    typeof scanResult.scanned_at === 'string' && scanResult.scanned_at.trim()
      ? scanResult.scanned_at
      : new Date().toISOString()

  const id =
    typeof scanResult.scan_id === 'string' && scanResult.scan_id.trim()
      ? scanResult.scan_id
      : `scan-${Date.now()}`

  // Sanitize stored report copy so sensitive query parameters or credentials are not persisted
  const sanitizedReport = {
    ...scanResult,
    url: displayUrl,
    normalized_url: displayUrl,
    scanned_at: scannedAt,
    scan_id: id,
  }

  const newEntry = {
    id,
    display_url: displayUrl,
    scanned_at: scannedAt,
    risk_score: scanResult.risk_score,
    risk_category: scanResult.risk_category,
    report: sanitizedReport,
  }

  const normalizedKey = displayUrl.toLowerCase()
  const deduplicated = existing.filter(
    (item) => item.display_url.toLowerCase() !== normalizedKey
  )

  const updated = [newEntry, ...deduplicated].slice(0, MAX_HISTORY_ENTRIES)

  const storage = getStorage(customStorage)
  try {
    if (storage) {
      storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
    } else {
      memoryFallbackStore = updated
    }
  } catch {
    // Quota or permission failure — keep in memory fallback and return updated list
    memoryFallbackStore = updated
  }

  return updated
}

/**
 * Clear all saved scan history entries.
 */
export function clearScanHistory(customStorage) {
  memoryFallbackStore = []
  const storage = getStorage(customStorage)
  try {
    if (storage) {
      storage.removeItem(HISTORY_STORAGE_KEY)
    }
  } catch {
    // Ignore storage removal errors
  }
  return []
}
