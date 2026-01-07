## Code Review Summary

### Scope
- Files reviewed: 6 files (capture.ts, service-worker.ts, App.vue, storage.ts, message.ts, types/index.ts)
- Lines of code analyzed: ~350 LOC
- Review focus: Security, performance, architecture, TypeScript type safety

---

## Overall Assessment

**Score: 7.2/10**

The codebase demonstrates solid foundation with clean separation of concerns. Key strengths: good MV3 architecture, proper message passing patterns, TypeScript strict mode enabled. Primary concerns: URL injection risk, missing validation, no retry logic.

---

## Critical Issues

### 1. URL Injection Vulnerability (HIGH)

**File:** `/src/background/service-worker.ts:60`
```typescript
const response = await fetch(`${API_BASE_URL}${payload.url}`, {
```
**Problem:** No validation of `payload.url` - attacker could inject arbitrary URLs via malicious payload.

**Fix:** Validate URL starts with `/` and does not contain protocol-relative URLs (`//`):
```typescript
const cleanUrl = payload.url.replace(/^\/+/, '/');
if (!cleanUrl.startsWith('/api/')) {
  throw new Error('Invalid API path');
}
const response = await fetch(`${API_BASE_URL}${cleanUrl}`, {...});
```

### 2. Sensitive Data in HTML Capture (MEDIUM)

**File:** `/src/content/capture.ts:22-24`
```typescript
export function capturePageHTML(): string {
  return document.documentElement.outerHTML;
}
```
**Problem:** Captures entire page HTML including auth tokens in DOM, cookies in localStorage attributes, session data.

**Fix:** Add sanitization or capture only relevant elements:
```typescript
export function capturePageHTML(): string {
  // Remove sensitive elements before capture
  const clone = document.documentElement.cloneNode(true) as Element;
  clone.querySelectorAll('[data-sensitive]').forEach(el => el.remove());
  return clone.outerHTML;
}
```

---

## High Priority Findings

### 3. Missing URL Validation in Capture Request

**File:** `/src/popup/App.vue:78-85`
```typescript
await sendMessage('API_REQUEST', {
  url: '/api/sessions/request',
  method: 'POST',
  body: { context: response }
});
```
**Problem:** No validation of the context data before sending.

**Fix:** Validate context before transmission using Zod (already a dependency).

### 4. No Rate Limiting / Retry Logic

**File:** `/src/background/service-worker.ts`
**Problem:** `forwardToAPI` lacks retry mechanism for transient failures.

**Fix:** Add exponential backoff:
```typescript
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2 ** i * 100));
    }
  }
  throw new Error('Unreachable');
}
```

### 5. External Avatar URL Without CSP

**File:** `/src/popup/App.vue:123,132,141`
```typescript
avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
```
**Problem:** Loading external resources without CSP directive allows potential data exfiltration.

**Fix:** Add to manifest.json:
```json
"content_security_policy": {
  "extension_pages": "default-src 'self'; img-src https://api.dicebear.com 'unsafe-inline';"
}
```

---

## Medium Priority Improvements

### 6. Unnecessary Promise.resolve Wrappers

**File:** `/src/content/capture.ts:117-120`
```typescript
const [pageHTML, selection, fileTree] = await Promise.all([
  Promise.resolve(capturePageHTML()),
  Promise.resolve(getSelection()),
  captureFileTree()
]);
```
**Problem:** `Promise.resolve()` wrappers add overhead.

**Fix:** Direct invocation:
```typescript
const [pageHTML, selection, fileTree] = await Promise.all([
  capturePageHTML(),
  getSelection(),
  captureFileTree()
]);
```

### 7. Inconsistent Error Handling

**File:** `/src/background/service-worker.ts:72-79`
```typescript
} catch (error) {
  console.error('API request failed:', error);
  return {
    status: 0,
    data: {
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  };
}
```
**Problem:** Error details logged to console (visible in extension logs).

**Fix:** Log with appropriate detail level, avoid exposing internals:
```typescript
console.warn('API request failed:', error.name);
return { status: 0, data: { error: 'Request failed' } };
```

### 8. Storage Timestamp Not Used

**File:** `/src/utils/storage.ts:13,38`
```typescript
interface StorageValue<T = unknown> {
  value: T;
  timestamp?: number;
}
```
**Problem:** Timestamp stored but never read/validated for expiration.

**Fix:** Either use it for cache expiration or remove dead code.

### 9. Missing Cleanup in Vue Component

**File:** `/src/popup/App.vue:155-158`
```typescript
onMounted(() => {
  checkAuth();
  loadExperts();
});
```
**Problem:** No `onUnmounted` cleanup if component unmounts during async operations.

**Fix:**
```typescript
const controller = new AbortController();

onMounted(() => {
  checkAuth(controller.signal);
  loadExperts(controller.signal);
});

onUnmounted(() => controller.abort());
```

### 10. Unused Type Export

**File:** `/src/types/index.ts:73`
```typescript
export type ExtensionMessage = CaptureContextRequest | AuthRequest | APIRequest;
```
**Problem:** `CaptureContextRequest` is defined but imported as `CodeContext` type, not the message type.

**Fix:** Remove unused type or verify if intentional.

---

## Low Priority Suggestions

### 11. Improve IDE Detection Robustness

**File:** `/src/content/capture.ts:8-17`
```typescript
export function detectIDE(): IDEType {
  const url = window.location.href;
  if (url.includes('cursor.sh')) return 'cursor';
  // ...
  return null;
}
```
**Suggestion:** Use `URL` constructor for more robust parsing:
```typescript
export function detectIDE(): IDEType {
  try {
    const hostname = new URL(window.location.href).hostname;
    if (hostname.includes('cursor.sh')) return 'cursor';
    // ...
  } catch { return null; }
}
```

### 12. Magic Numbers for Rate Display

**File:** `/src/popup/App.vue:17`
```typescript
return `$${(expert.rate / 100).toFixed(0)}/hr`;
```
**Suggestion:** Extract to constant:
```typescript
const CENTS_TO_DOLLARS = 100;
return `$${(expert.rate / CENTS_TO_DOLLARS).toFixed(0)}/hr`;
```

### 13. Hardcoded API Base URL Fallback

**File:** `/src/background/service-worker.ts:6`
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:54321';
```
**Suggestion:** Use `undefined` instead of localhost for development safety:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL;
if (!API_BASE_URL) throw new Error('VITE_API_URL not configured');
```

---

## Positive Observations

- **Clean Architecture:** Clear separation between content scripts, service worker, popup, and utilities
- **TypeScript Strict Mode:** Full strict mode enabled in tsconfig.json
- **Proper MV3 Patterns:** Correct use of chrome.runtime.sendMessage with async responses
- **Good Imports:** Type-only imports where appropriate (`import type`)
- **Zod Dependency Available:** Can be used for runtime validation

---

## Recommended Actions (Priority Order)

1. **Immediate:** Fix URL injection vulnerability (Issue #1)
2. **High:** Add URL validation before fetch (Issue #3)
3. **High:** Add rate limiting/retry logic (Issue #4)
4. **Medium:** Sanitize HTML capture or limit scope (Issue #2)
5. **Medium:** Add CSP for external avatar URLs (Issue #5)
6. **Low:** Remove unnecessary Promise.resolve wrappers (Issue #6)

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Safety | Strict mode enabled, good coverage |
| Test Coverage | Unknown (no test files found) |
| Linting Issues | Cannot run without project setup |
| Security Vulnerabilities | 2 medium, 1 high priority |
| Code Duplication | Minimal |
| Bundle Size | Unknown |

---

**Reviewer:** code-reviewer
**Date:** 2026-01-07
**Report:** /Users/bobacu/test/callAnExpert/plans/reports/code-reviewer-260107-2255-chrome-extension.md
