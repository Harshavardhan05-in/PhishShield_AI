/**
 * PhishShield AI — Extension Popup Script (Manifest V3)
 *
 * Responsibilities:
 *   1. Validate URL input client-side.
 *   2. Open the dashboard in a new tab with the URL passed as a query param.
 *   3. Never navigate to the suspicious URL directly.
 *   4. Never execute scripts from the submitted URL.
 *   5. Never access browsing history or existing tabs.
 */

'use strict';

// Dashboard URL — defaults to deployed production dashboard (set to DEV_DASHBOARD_URL for local dev)
const PROD_DASHBOARD_URL = 'https://phish-shield-ai-pink.vercel.app/dashboard';
const DEV_DASHBOARD_URL = 'http://localhost:5173/dashboard';
const DASHBOARD_BASE_URL = PROD_DASHBOARD_URL;

// DOM references
const form = document.getElementById('scan-form');
const urlInput = document.getElementById('url-input');
const scanBtn = document.getElementById('scan-btn');
const btnText = document.getElementById('btn-text');
const errorMsg = document.getElementById('url-error');
const hintMsg = document.getElementById('url-hint');

/**
 * Validate the URL input.
 * Returns an error string, or empty string if valid.
 */
function validateUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter a URL to scan.';

  let testUrl = trimmed;
  if (!/^https?:\/\//i.test(testUrl)) {
    testUrl = 'http://' + testUrl;
  }

  try {
    const parsed = new URL(testUrl);
    if (!parsed.hostname || parsed.hostname.length < 2) {
      return 'URL does not have a valid hostname.';
    }
  } catch {
    return 'This does not look like a valid URL.';
  }

  if (trimmed.length > 2048) {
    return 'URL is too long (max 2048 characters).';
  }

  return '';
}

/**
 * Show an inline error message.
 */
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
  hintMsg.hidden = true;
  urlInput.setAttribute('aria-invalid', 'true');
}

/**
 * Clear inline error.
 */
function clearError() {
  errorMsg.hidden = true;
  hintMsg.hidden = false;
  urlInput.setAttribute('aria-invalid', 'false');
}

/**
 * Set the button to loading state.
 */
function setLoading(isLoading) {
  if (isLoading) {
    scanBtn.disabled = true;
    urlInput.disabled = true;
    btnText.textContent = 'Opening…';
    // Replace icon with spinner
    const icon = scanBtn.querySelector('.btn-icon');
    if (icon) {
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      icon.replaceWith(spinner);
    }
  } else {
    scanBtn.disabled = false;
    urlInput.disabled = false;
    btnText.textContent = 'Scan URL';
    const spinner = scanBtn.querySelector('.spinner');
    if (spinner) {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('class', 'btn-icon');
      icon.setAttribute('width', '14');
      icon.setAttribute('height', '14');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '2.5');
      icon.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('d', 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z');
      icon.appendChild(path);
      spinner.replaceWith(icon);
    }
  }
}

/**
 * Handle form submission.
 */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const rawUrl = urlInput.value;
  const validationError = validateUrl(rawUrl);

  if (validationError) {
    showError(validationError);
    urlInput.focus();
    return;
  }

  setLoading(true);

  try {
    // Send URL to FastAPI endpoint POST /api/v1/scan via extension service worker
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ action: 'SCAN_URL', url: rawUrl.trim() }, () => {
        if (chrome.runtime.lastError) { /* ignore if popup closes first */ }
      });
    }

    // Build the dashboard URL with the scanned URL as a query parameter.
    // The URL is encoded so it arrives at the dashboard intact.
    // The dashboard opens the URL but NEVER navigates to it.
    const params = new URLSearchParams({
      url: rawUrl.trim(),
      extId: chrome?.runtime?.id || ''
    });
    const dashboardUrl = `${DASHBOARD_BASE_URL}?${params.toString()}`;

    await chrome.tabs.create({ url: dashboardUrl, active: true });

    // Close the popup after opening the tab
    window.close();
  } catch (err) {
    setLoading(false);
    showError('Could not open the dashboard. Please check your browser settings.');
    console.error('PhishShield popup error:', err);
  }
});

// Clear errors on input change
urlInput.addEventListener('input', () => {
  if (errorMsg.hidden === false) {
    clearError();
  }
});

// Focus input on popup open
document.addEventListener('DOMContentLoaded', () => {
  urlInput.focus();
});
