# Extensions Codebase Summary

Generated: 2026-01-07

## Overview

Chrome extension (Manifest V3) for connecting users with AI experts. Built with Wxt framework, Vue 3, and TypeScript.

## Metrics

| Metric | Value |
|--------|-------|
| Total Files | 16 |
| Total Tokens | 8,279 |
| Total Chars | 32,557 |
| Output | repomix-extensions-output.xml |

## Top Files by Token Count

| File | Tokens | Chars | % |
|------|--------|-------|---|
| src/popup/App.vue | 2,830 | 10,282 | 34.2% |
| src/content/capture.ts | 949 | 3,985 | 11.5% |
| src/background/service-worker.ts | 879 | 3,770 | 10.6% |
| src/content/capture.test.ts | 603 | 2,430 | 7.3% |
| src/types/index.test.ts | 452 | 1,838 | 5.5% |

## Project Structure

```
extensions/
├── package.json              # v0.1.0 | Wxt, Vue 3, TypeScript, Vitest
├── tsconfig.json             # ESNext + DOM, path aliases (~/*)
├── vitest.config.ts          # jsdom environment
├── .env.example              # VITE_API_URL, Supabase, Daily.co keys
├── repomix-extensions-output.xml
└── src/
    ├── content/
    │   ├── capture.ts        # DOM capture for AI IDEs
    │   └── capture.test.ts   # Unit tests
    ├── background/
    │   └── service-worker.ts # Auth + API proxy
    ├── popup/
    │   └── App.vue           # Vue 3 Composition API
    ├── types/
    │   ├── index.ts          # TypeScript interfaces
    │   └── index.test.ts     # Type tests
    ├── utils/
    │   ├── storage.ts        # Chrome storage wrapper
    │   └── message.ts        # Message passing
    ├── vite-env.d.ts         # Vue file imports
    └── test-setup.ts         # Chrome API mocks
```

## Technology Stack

- **Framework**: Wxt (Chrome extension bundler)
- **UI**: Vue 3.4+ with Composition API
- **Language**: TypeScript 5.3+
- **Testing**: Vitest + jsdom
- **Styling**: Scoped CSS (inline)
- **Validation**: Zod 3.22

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| vue | ^3.4.0 | UI framework |
| @vueuse/core | ^10.7.0 | Vue utilities |
| zod | ^3.22.0 | Runtime validation |
| @types/chrome | ^0.0.254 | Chrome API types |

## Key Components

### Content Script (capture.ts)

Detects AI IDEs and captures context:
- **Supported**: Cursor, Replit, v0, Lovable
- **Captures**: HTML, text selection, file tree (DOM-based)
- **Output**: `CodeContext` object

### Service Worker (service-worker.ts)

Manifest V3 compliant background handler:
- **Auth**: Token storage/retrieval
- **API Proxy**: Whitelist-based endpoint validation
- **Security**: URL injection prevention

### Popup (App.vue)

User-facing interface:
- Auth state display
- Expert listing (with mock fallback)
- Context capture trigger
- Session creation flow

## Security

- No suspicious files detected
- API whitelist prevents URL injection
- Auth tokens stored via Chrome storage

## Testing

- Unit tests for content capture and types
- Chrome API mocks in test-setup.ts
- jsdom environment for Vue testing
