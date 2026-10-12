import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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
