/**
 * PhishShield AI — Extension Background Service Worker (Manifest V3)
 * Handles navigation requests (e.g. Go to Browser Home Page) and direct URL scan requests.
 */

const PROD_API_BASE_URL = 'https://phishshield-ai-uvv5.onrender.com';
const DEV_API_BASE_URL = 'http://localhost:8000';
const API_BASE_URL = PROD_API_BASE_URL;

async function performScanApi(url) {
  const baseUrl = API_BASE_URL.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
  const response = await fetch(`${baseUrl}/api/v1/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ url: url.trim() }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail || `API request failed with status ${response.status}`);
  }
  return await response.json();
}

function handleMessage(request, sender, sendResponse) {
  if (!request || !request.action) {
    sendResponse({ success: false, error: 'Invalid action' });
    return false;
  }

  if (request.action === 'OPEN_HOMEPAGE') {
    if (sender?.tab?.id) {
      chrome.tabs.update(sender.tab.id, { url: 'chrome://newtab/' }, () => {
        sendResponse({ success: true });
      });
      return true;
    } else {
      chrome.tabs.create({ url: 'chrome://newtab/' }, () => {
        sendResponse({ success: true });
      });
      return true;
    }
  }

  if (request.action === 'SCAN_URL') {
    if (!request.url || typeof request.url !== 'string') {
      sendResponse({ success: false, error: 'A URL string is required.' });
      return false;
    }
    performScanApi(request.url)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return false;
}

// Listen to messages from extension components (e.g. popup.js)
chrome.runtime.onMessage.addListener(handleMessage);

// Listen to external messages from authorized dashboard tabs (externally_connectable)
chrome.runtime.onMessageExternal.addListener(handleMessage);

