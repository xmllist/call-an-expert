# Research Report: Chrome Extension Development Patterns

**Date:** 2026-01-07
**Author:** Claude Code Research Subagent

## Executive Summary

Chrome extensions with Manifest V3 provide a secure, performant foundation for building tools that capture code context from AI IDEs like Cursor, Replit, v0, and Lovable. The key architectural shift from Manifest V2 is the replacement of background pages with service workers and stricter content script isolation. Recommended stack includes vanilla JavaScript with TypeScript, WXT or Plasmo frameworks for bundling, and Chrome's native message passing for inter-component communication.

## Key Findings

### 1. Manifest V3 Architecture

- **Manifest Version**: Mandatory Manifest V3 since January 2022; all extensions must use `manifest_version: 3`
- **Core Components**:
  - `manifest.json`: Configuration file defining capabilities, permissions, and entry points
  - Service Worker (background script): Replaces persistent background pages; event-driven lifecycle
  - Content Scripts: Injected into web pages; operate in isolated worlds
  - Popup/Options Pages: User-facing UI components
- **Key Changes from V2**:
  - No persistent background pages → service workers only
  - Remote code execution banned → all code bundled locally
  - Declarative net request for ad-blocking
  - Stronger content script isolation

### 2. Content Scripts vs Background Scripts

| Aspect | Content Scripts | Background Scripts (Service Worker) |
|--------|-----------------|-------------------------------------|
| Lifecycle | Per-tab, tied to page load | Event-driven, may terminate |
| DOM Access | Full access to page DOM | No DOM access |
| Scope | Isolated world per page | Global extension context |
| Communication | `chrome.runtime.sendMessage` | `chrome.tabs.sendMessage` |
| Use Case | DOM scraping, code capture | API calls, auth, state |

**Pattern**: Content scripts capture code/UI state → send to service worker → service worker forwards to backend.

### 3. Secure Code Capture & Data Handling

- **Permissions Strategy**: Request only `activeTab` or specific host permissions; avoid `<all_urls>`
- **Isolation**: Content scripts run in isolated worlds—can't access page JS variables directly
- **XSS Prevention**: Sanitize captured code before transmission; use `chrome.runtime.sendMessage` with structured data
- **Storage**: Use `chrome.storage.local` (encrypted) for sensitive data; avoid `localStorage` (accessible by page)
- **Code Capture Methods**:
  - `document.documentElement.outerHTML` for full page
  - `window.getSelection().toString()` for selections
  - AST parsing via injected scripts for structured code extraction

### 4. Communication Patterns

**Content Script ↔ Service Worker**:
```javascript
// Content script
chrome.runtime.sendMessage({ type: 'CAPTURE_CODE', data: code });

// Service worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CAPTURE_CODE') {
    fetch('https://api.example.com/submit', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(msg.data)
    });
  }
});
```

**Best Practices**:
- Use message passing instead of shared state
- Implement request/response pattern with `sendResponse` for async operations
- Add message validation with schema (Zod/Joi)

### 5. Authentication Patterns

| Pattern | Use Case | Security |
|---------|----------|----------|
| OAuth 2.0 PKCE | User login to backend | High; prevents token interception |
| Chrome Identity API | Google Sign-In | Native; handles tokens securely |
| JWT Storage | Session management | Store in `chrome.storage.local`, not localStorage |
| Background Token Refresh | Automated re-auth | Service worker handles silently |

**Recommended Flow**:
1. User authenticates via popup/options page
2. Token stored in `chrome.storage.local` (encrypted at rest via Chrome)
3. Service worker attaches token to API requests
4. Implement token refresh logic in service worker

### 6. Recommended Frameworks

- **WXT**: Modern, Vue-first, excellent DX, minimal config
- **Plasmo**: React-first, hot reload, built-in storage
- **Vanilla + Vite**: Maximum control, smallest bundle
- **@/chrome/extensions**: TypeScript definitions

## Implementation Recommendations

### Quick Start (WXT)
```bash
npm create wxt@latest
# Configure manifest.json permissions
# Create content script for code capture
# Implement service worker for backend communication
```

### Architecture for Your Use Case
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│ AI IDE (Cursor) │────▶│ Content Script   │────▶│ Service     │
│ Page            │     │ (code capture)   │     │ Worker      │
└─────────────────┘     └──────────────────┘     │             │
                                                  │ HTTPS      │
                                                  ▼             │
                                            ┌─────────────┐     │
                                            │ Backend API │◀────┘
                                            │ (your srv)  │
                                            └─────────────┘
```

### Critical Security Notes
- Never embed API keys in extension code
- Use HTTPS only for API endpoints
- Implement CSP (Content Security Policy) in manifest
- Validate all data from content scripts on backend

## Resources

- [Chrome Extensions Official Docs](https://developer.chrome.com/docs/extensions)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro)
- [WXT Framework](https://wxt.dev)
- [Plasmo Framework](https://docs.plasmo.com)

---

## Unresolved Questions

1. Which AI IDEs (Cursor, Replit, v0, Lovable) expose code via DOM vs require injection?
2. Do these platforms have official extension policies/restrictions?
3. Rate limits and authentication requirements for each platform's API?
