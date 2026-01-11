// Service worker: Authentication and API proxy for Manifest V3

import { getAuthToken, setAuthToken, removeAuthToken } from '../src/utils/storage';
import type { AuthPayload, APIRequestPayload, ExtensionMessage } from '../src/types';

const API_BASE_URL = 'http://localhost:54321';

// Allowed API endpoints (whitelist for security)
const ALLOWED_ENDPOINTS = [
  '/api/experts',
  '/api/sessions/request',
  '/api/sessions/create',
  '/api/sessions/',
  '/api/profile',
  '/api/auth/'
];

function isAllowedEndpoint(url: string): boolean {
  if (!url.startsWith('/api/')) return false;
  if (ALLOWED_ENDPOINTS.includes(url)) return true;

  const baseEndpoints = ALLOWED_ENDPOINTS.filter(e => e.endsWith('/'));
  for (const base of baseEndpoints) {
    if (url.startsWith(base)) return true;
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

async function handleAuth(payload: AuthPayload): Promise<AuthResponse> {
  const { action, token } = payload;
  switch (action) {
    case 'login':
      if (!token) return { success: false };
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

async function forwardToAPI(payload: APIRequestPayload): Promise<APIResponse> {
  if (!payload.url || !isAllowedEndpoint(payload.url)) {
    return { status: 403, data: { error: 'Invalid endpoint' } };
  }

  const token = await getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE_URL}${payload.url}`, {
      method: payload.method || 'GET',
      headers,
      body: payload.body ? JSON.stringify(payload.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    return {
      status: 0,
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message.type === 'AUTH_REQUEST') {
      handleAuth(message.payload)
        .then(sendResponse)
        .catch(() => sendResponse({ success: false }));
      return true;
    }
    if (message.type === 'API_REQUEST') {
      forwardToAPI(message.payload)
        .then(sendResponse)
        .catch(() => sendResponse({ status: 0, data: { error: 'Request failed' } }));
      return true;
    }
    return false;
  });
});
