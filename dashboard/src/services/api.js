import axios from 'axios'

const PROD_BACKEND_URL = 'https://phishshield-ai-uvv5.onrender.com'
const DEV_BACKEND_URL = 'http://localhost:8000'

export function resolveApiBaseUrl(
  envUrl = import.meta.env.VITE_API_BASE_URL,
  isProd = import.meta.env.PROD,
  hostname = typeof window !== 'undefined' ? window.location.hostname : ''
) {
  const trimmed = typeof envUrl === 'string' ? envUrl.trim() : ''
  const isLocalRuntime = hostname === 'localhost' || hostname === '127.0.0.1'

  let raw = trimmed
  if (!raw) {
    raw = isProd ? PROD_BACKEND_URL : DEV_BACKEND_URL
  } else if (
    isProd &&
    !isLocalRuntime &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(raw)
  ) {
    raw = PROD_BACKEND_URL
  }

  // Strip trailing slashes and any accidental trailing /api/v1 segment
  return raw.replace(/\/+$/, '').replace(/\/api\/v1$/i, '').replace(/\/+$/, '')
}

export const BASE_URL = resolveApiBaseUrl()

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

/**
 * Submit a URL for phishing analysis.
 * @param {string|object} url - The URL string or object containing url property
 * @returns {Promise<object>} ScanResponse
 */
export async function scanUrl(url) {
  const urlString = typeof url === 'string' ? url : (url?.url || '')
  const response = await api.post('/api/v1/scan', { url: urlString.trim() })
  return response.data
}

/**
 * Check backend health.
 * @returns {Promise<object>}
 */
export async function getHealth() {
  const response = await api.get('/api/v1/health')
  return response.data
}

/**
 * Get ML model status.
 * @returns {Promise<object>}
 */
export async function getModelStatus() {
  const response = await api.get('/api/v1/model-status')
  return response.data
}

export default api
