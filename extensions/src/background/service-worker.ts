// Service worker: Authentication and API proxy for Manifest V3

import { getAuthToken, setAuthToken, removeAuthToken } from '../utils/storage';
import type { AuthPayload, APIRequestPayload, ExtensionMessage } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:54321';

// Allowed API endpoints (whitelist for security)
const ALLOWED_ENDPOINTS = [
  '/api/experts',
  '/api/sessions/request',
  '/api/sessions/create',
  '/api/sessions/',
  '/api/profile',
  '/api/auth/'
];

/**
 * Validate URL is allowed (prevent URL injection)
 */
function isAllowedEndpoint(url: string): boolean {
  // Must start with /api/ and be in whitelist or match pattern
  if (!url.startsWith('/api/')) {
    return false;
  }

  // Check exact matches
  if (ALLOWED_ENDPOINTS.includes(url)) {
    return true;
  }

  // Check pattern matches (e.g., /api/sessions/{id})
  const baseEndpoints = ALLOWED_ENDPOINTS.filter(e => e.endsWith('/'));
  for (const base of baseEndpoints) {
    if (url.startsWith(base)) {
      return true;
    }
  }

  return false;
}

interface AuthResponse {
  success: boolean;
  token?: string;
}

interface APIResponse {
  status: number;
  data: Record<string, unknown>;
}

/**
 * Handle authentication requests
 */
async function handleAuth(payload: AuthPayload): Promise<AuthResponse> {
  const { action, token } = payload;

  switch (action) {
    case 'login':
      if (!token) {
        return { success: false };
      }
      await setAuthToken(token);
      return { success: true, token };

    case 'logout':
      await removeAuthToken();
      return { success: true };

    case 'getToken':
      const storedToken = await getAuthToken();
      return { success: true, token: storedToken };

    default:
      return { success: false };
  }
}

/**
 * Forward API request to backend with authentication
 */
async function forwardToAPI(payload: APIRequestPayload): Promise<APIResponse> {
  // Validate URL before making request
  if (!payload.url || !isAllowedEndpoint(payload.url)) {
    return {
      status: 403,
      data: { error: 'Invalid endpoint' }
    };
  }

  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${payload.url}`, {
      method: payload.method || 'GET',
      headers,
      body: payload.body ? JSON.stringify(payload.body) : undefined
    });

    const data = await response.json().catch(() => ({}));

    return {
      status: response.status,
      data
    };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      status: 0,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Initialize service worker listeners
 */
function setupListeners(): void {
  chrome.runtime.onMessage.addListener((
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    // Handle authentication requests
    if (message.type === 'AUTH_REQUEST') {
      handleAuth(message.payload)
        .then(sendResponse)
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Async response
    }

    // Handle API requests
    if (message.type === 'API_REQUEST') {
      forwardToAPI(message.payload)
        .then(sendResponse)
        .catch((error) => {
          sendResponse({ status: 0, data: { error: error.message } });
        });
      return true; // Async response
    }

    return false;
  });
}

// Initialize service worker
setupListeners();
