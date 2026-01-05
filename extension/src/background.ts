/**
 * Background Service Worker for Last20 Chrome Extension
 *
 * Handles:
 * - API communication with the web app backend
 * - Message passing from popup and content scripts
 * - Authentication state management via chrome.storage
 */

import {
  // Auth utilities
  AuthTokens,
  getAuthTokens,
  setAuthTokens,
  clearAuthTokens,
  isAuthenticated,
  // API functions
  createHelpRequest,
  getUserProfile,
  getHelpRequests,
  getMatchedExperts,
  getSessions,
  getSession,
  getSubscription,
  // URL utilities
  getApiBaseUrl,
  getDashboardUrl,
  getLoginUrl,
  getSessionUrl,
} from './api'

// Types for messages
interface HelpRequestPayload {
  title: string
  description: string
  screenshot: string | null
  context: {
    url: string
    title: string
    timestamp: string
  } | null
}

interface MessageRequest {
  type: string
  payload?: unknown
}

interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Submit a help request to the backend API
 */
async function submitHelpRequest(payload: HelpRequestPayload): Promise<MessageResponse> {
  // Prepare the request body for the API
  const requestPayload = {
    title: payload.title,
    description: payload.description,
    screenshot_url: payload.screenshot, // Will be processed by backend
    context: payload.context ? {
      url: payload.context.url,
      page_title: payload.context.title,
      captured_at: payload.context.timestamp,
    } : null,
  }

  const { data, error } = await createHelpRequest(requestPayload)

  if (error) {
    return { success: false, error }
  }

  return { success: true, data }
}

/**
 * Get the current user's profile
 */
async function fetchUserProfile(): Promise<MessageResponse> {
  const { data, error } = await getUserProfile()

  if (error) {
    return { success: false, error }
  }

  return { success: true, data }
}

/**
 * Handle authentication callback from the web app
 * Called when user logs in via the web app and tokens need to be synced
 */
async function handleAuthCallback(tokens: AuthTokens): Promise<MessageResponse> {
  try {
    await setAuthTokens(tokens)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to store auth tokens'
    return { success: false, error: errorMessage }
  }
}

/**
 * Handle logout - clear stored tokens
 */
async function handleLogout(): Promise<MessageResponse> {
  try {
    await clearAuthTokens()
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to clear auth tokens'
    return { success: false, error: errorMessage }
  }
}

/**
 * Open the web app dashboard in a new tab
 */
async function openDashboard(): Promise<MessageResponse> {
  try {
    await chrome.tabs.create({ url: getDashboardUrl() })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to open dashboard'
    return { success: false, error: errorMessage }
  }
}

/**
 * Open the login page in a new tab
 */
async function openLogin(): Promise<MessageResponse> {
  try {
    await chrome.tabs.create({ url: getLoginUrl() })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to open login page'
    return { success: false, error: errorMessage }
  }
}

/**
 * Get authentication status for the popup
 */
async function getAuthStatus(): Promise<MessageResponse> {
  const authenticated = await isAuthenticated()
  const tokens = await getAuthTokens()

  return {
    success: true,
    data: {
      isAuthenticated: authenticated,
      expiresAt: tokens?.expiresAt || null,
    },
  }
}

// Message handler for popup and content scripts
chrome.runtime.onMessage.addListener(
  (
    request: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean => {
    // Handle different message types
    const handleMessage = async (): Promise<MessageResponse> => {
      switch (request.type) {
        case 'SUBMIT_HELP_REQUEST':
          return submitHelpRequest(request.payload as HelpRequestPayload)

        case 'GET_USER_PROFILE':
          return fetchUserProfile()

        case 'AUTH_CALLBACK':
          return handleAuthCallback(request.payload as AuthTokens)

        case 'LOGOUT':
          return handleLogout()

        case 'OPEN_DASHBOARD':
          return openDashboard()

        case 'OPEN_LOGIN':
          return openLogin()

        case 'GET_AUTH_STATUS':
          return getAuthStatus()

        case 'PING':
          // Health check
          return { success: true, data: { status: 'alive' } }

        default:
          return { success: false, error: `Unknown message type: ${request.type}` }
      }
    }

    // Execute the handler and send response
    handleMessage()
      .then(sendResponse)
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        sendResponse({ success: false, error: errorMessage })
      })

    // Return true to indicate async response
    return true
  }
)

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open onboarding page on first install
    chrome.tabs.create({ url: `${getApiBaseUrl()}/welcome?source=extension` })
  }
})

// Listen for messages from web pages (for auth sync)
chrome.runtime.onMessageExternal.addListener(
  (
    request: MessageRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean => {
    // Only accept messages from our web app
    // Include the configured API base URL and production domains
    const apiBaseOrigin = new URL(getApiBaseUrl()).origin
    const allowedOrigins = [
      apiBaseOrigin,
      'http://localhost:3000',
      'https://last20.app',
      'https://www.last20.app',
    ]

    const senderOrigin = sender.url ? new URL(sender.url).origin : null
    if (!senderOrigin || !allowedOrigins.includes(senderOrigin)) {
      sendResponse({ success: false, error: 'Unauthorized origin' })
      return true
    }

    // Handle auth sync from web app
    if (request.type === 'SYNC_AUTH') {
      handleAuthCallback(request.payload as AuthTokens)
        .then(sendResponse)
        .catch((error) => {
          const errorMessage = error instanceof Error ? error.message : 'Auth sync failed'
          sendResponse({ success: false, error: errorMessage })
        })
      return true
    }

    if (request.type === 'SYNC_LOGOUT') {
      handleLogout()
        .then(sendResponse)
        .catch((error) => {
          const errorMessage = error instanceof Error ? error.message : 'Logout sync failed'
          sendResponse({ success: false, error: errorMessage })
        })
      return true
    }

    sendResponse({ success: false, error: 'Unknown external message type' })
    return true
  }
)
