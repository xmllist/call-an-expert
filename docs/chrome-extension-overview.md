# Chrome Extension Overview

Call-an-Expert is a Manifest V3 Chrome extension that connects users with AI experts for 1-hour screen share sessions. The extension captures code context from AI IDEs and facilitates expert matching.

## Architecture

```
extensions/
├── package.json              # Dependencies & scripts (Wxt, Vue 3, TypeScript)
├── tsconfig.json             # TypeScript config with path aliases (~/*)
├── vitest.config.ts          # Vitest test configuration
├── .env.example              # Environment variables template
└── src/
    ├── content/
    │   └── capture.ts        # DOM-based code capture for AI IDEs
    ├── background/
    │   └── service-worker.ts # Auth & API proxy (Manifest V3)
    ├── popup/
    │   └── App.vue           # Vue 3 popup UI
    ├── types/
    │   └── index.ts          # Shared TypeScript interfaces
    ├── utils/
    │   ├── storage.ts        # Chrome storage utilities
    │   └── message.ts        # Message passing utilities
    ├── vite-env.d.ts         # Vite/Vue type declarations
    └── test-setup.ts         # Chrome API mocks for testing
```

## Key Files

### Content Script (`src/content/capture.ts`)

Injected into AI IDE pages to capture code context.

| Function | Purpose |
|----------|---------|
| `detectIDE()` | Identifies AI IDE (cursor, replit, v0, lovable) |
| `capturePageHTML()` | Gets full page DOM as string |
| `getSelection()` | Captures user text selection |
| `captureFileTree()` | Extracts file tree from IDE DOM |
| `captureCodeContext()` | Main entry - returns `CodeContext` object |

Message handlers:
- `CAPTURE_CONTEXT` - Returns captured code context
- `DETECT_IDE` - Returns detected IDE type

### Service Worker (`src/background/service-worker.ts`)

Handles authentication and API proxying per Manifest V3 requirements.

| Function | Purpose |
|----------|---------|
| `isAllowedEndpoint()` | URL whitelist validation |
| `handleAuth()` | Login/logout/token retrieval |
| `forwardToAPI()` | Proxy requests to backend with auth header |

Allowed endpoints (whitelist):
- `/api/experts`
- `/api/sessions/request`
- `/api/sessions/create`
- `/api/sessions/` (pattern match)
- `/api/profile`
- `/api/auth/`

Message handlers:
- `AUTH_REQUEST` - Authentication operations
- `API_REQUEST` - Backend API calls

### Popup UI (`src/popup/App.vue`)

Vue 3 Composition API component for user interaction.

**State**: `loading`, `capturing`, `experts`, `selectedExpert`, `currentContext`, `error`, `isAuthenticated`

**Workflow**:
1. On mount: Check auth, load experts
2. User clicks "Capture Context": Captures from active tab
3. User selects expert: Creates session request
4. Confirmation: Shows selected expert and session info

### Shared Types (`src/types/index.ts`)

```typescript
interface CodeContext {
  success: boolean;
  ide?: IDEType;           // 'cursor' | 'replit' | 'v0' | 'lovable' | null
  html?: string;
  selection?: string;
  fileTree?: Record | null;
  url?: string;
  timestamp?: number;
}

interface Expert {
  id: string;
  name: string;
  avatar: string;
  skills: string[];
  rate: number;            // cents per hour
  rating: number;
  available: boolean;
}

interface Session {
  id: string;
  expertId: string;
  userId: string;
  status: SessionStatus;   // pending | matched | in_progress | completed | cancelled | disputed
  context?: CodeContext;
  roomUrl?: string;
  durationMinutes: number;
}
```

### Storage Utilities (`src/utils/storage.ts`)

Chrome storage wrapper with timestamp tracking.

```typescript
get<T>(key)          // Retrieve typed value
set<T>(key, value)   // Store with timestamp
remove(key)          // Delete key
clear()              // Clear all
getAuthToken()       // Get stored JWT
setAuthToken(token)  // Store JWT
removeAuthToken()    // Delete JWT
```

### Message Utilities (`src/utils/message.ts`)

Promise-based message passing.

```typescript
sendMessage<T>(type, payload)      // To service worker
sendMessageToTab<T>(tabId, type, payload)  // To content script
```

## Development

### Setup

```bash
cd extensions
npm install
cp .env.example .env  # Configure API URL
```

### Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Wxt dev server (watch mode) |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm run preview` | Preview built extension |
| `npm test` | Run Vitest unit tests |
| `npm run test:ui` | Run tests with UI |

### Loading in Chrome

1. `npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. "Load unpacked" -> select `extensions/dist`
5. Pin extension to toolbar

### Environment Variables

```bash
VITE_API_URL=http://localhost:54321      # Backend API
VITE_SUPABASE_URL=http://localhost:54321 # Auth provider
VITE_SUPABASE_ANON_KEY=xxx               # Supabase anon key
VITE_DAILY_API_KEY=xxx                   # Video call provider
```

## Testing

### Unit Tests

Tests located alongside source files: `src/**/*.test.ts`

Test setup (`src/test-setup.ts`) mocks:
- `chrome.runtime.onMessage`
- `chrome.runtime.sendMessage`
- `chrome.storage.local`
- `chrome.tabs.query/sendMessage`

Run with:
```bash
npm test              # Headless
npm run test:ui       # Browser UI
```

### Manual Testing

1. Open Cursor/replit/v0/lovable in browser
2. Open extension popup
3. Click "Capture Context"
4. Verify context captured indicator appears
5. Select an expert
6. Verify session creation

## Phase 01 Features

| Feature | Status |
|---------|--------|
| Code context capture from AI IDEs | Done |
| Service worker auth/API proxy | Done |
| Vue popup UI with expert listing | Done |
| Mock data fallback for experts | Done |
| Session creation flow | Done |

## Known Limitations

- File tree capture is DOM-based (fragile for IDE updates)
- No real authentication implementation yet
- Mock experts used when API unavailable
- No settings page implementation
- No video call integration (Daily.co placeholder)

## Future Enhancements (Phase 02+)

- Real Supabase authentication
- Daily.co video room integration
- Settings page for preferences
- Improved file tree extraction via IDE APIs
- Session history view
- Expert reviews/ratings system
