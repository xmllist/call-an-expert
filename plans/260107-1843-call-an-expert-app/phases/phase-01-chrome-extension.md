---
title: "Phase 01: Chrome Extension Foundation"
description: "WXT-based Chrome extension with code capture for AI IDEs"
effort: 24h
phase: 01
parallel-group: A
dependencies: []
status: pending
---

# Phase 01: Chrome Extension Foundation

## Exclusive File Ownership

```
/extensions/
  /src/
    /content/
      capture.ts         # DOM-based code capture
      ide-detect.ts      # Cursor/Replit/v0/Lovable detection
    /popup/
      App.vue            # Main popup UI
      ExpertSearch.vue   # Expert matching UI
    /background/
      service-worker.ts  # Service worker (Manifest V3)
      auth.ts            # Token management
    /utils/
      message.ts         # Chrome message passing
      storage.ts         # chrome.storage wrapper
  manifest.ts             # WXT manifest config
  package.json
```

## Implementation Steps

### 1.1 WXT Project Setup
```bash
npm create wxt@latest call-an-expert-ext
cd call-an-expert-ext
npm install @vueuse/core zod
```

**Output**: Scaffolded WXT project with TypeScript

### 1.2 Manifest Configuration (manifest.ts)
```typescript
import { defineManifest } from '@wxt-dev/auto-config';

export default defineManifest({
  name: 'Call-an-Expert',
  description: 'Connect with AI experts for 15-minute screen share sessions',
  version: '0.1.0',
  manifest_version: 3,
  permissions: [
    'storage',
    'activeTab',
    'tabs',
    'nativeMessaging'
  ],
  host_permissions: [
    'https://cursor.sh/*',
    'https://replit.com/*',
    'https://v0.dev/*',
    'https://lovable.dev/*'
  ],
  action: {
    default_popup: 'popup.html',
    default_icon: 'icon-48.png'
  },
  background: {
    service_worker: 'background/service-worker.ts'
  },
  content_scripts: [
    {
      matches: [
        'https://cursor.sh/*',
        'https://replit.com/*',
        'https://v0.dev/*',
        'https://lovable.dev/*'
      ],
      js: ['content/capture.js'],
      run_at: 'document_idle'
    }
  ]
});
```

### 1.3 Content Script: Code Capture (content/capture.ts)

```typescript
// Detect AI IDE and extract code context
export function detectIDE(): string | null {
  const url = window.location.href;
  if (url.includes('cursor.sh')) return 'cursor';
  if (url.includes('replit.com')) return 'replit';
  if (url.includes('v0.dev')) return 'v0';
  if (url.includes('lovable.dev')) return 'lovable';
  return null;
}

export async function captureCodeContext(): Promise<CodeContext> {
  const ide = detectIDE();
  if (!ide) return { success: false };

  // Method 1: Full page HTML (works for most IDEs)
  const pageHTML = document.documentElement.outerHTML;

  // Method 2: Editor selection (if accessible)
  const selection = window.getSelection()?.toString() || '';

  // Method 3: File tree structure (platform-specific)
  const fileTree = await captureFileTree();

  return {
    success: true,
    ide,
    html: pageHTML,
    selection,
    fileTree,
    url: window.location.href,
    timestamp: Date.now()
  };
}

async function captureFileTree(): Promise<any> {
  // Platform-specific file tree extraction
  // Returns null if not accessible
  return null;
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CAPTURE_CONTEXT') {
    captureCodeContext().then(sendResponse);
    return true; // Async response
  }
});
```

### 1.4 Service Worker: Auth & API Proxy (background/service-worker.ts)

```typescript
import { chrome } from 'wxt/browser';
import { sendMessage } from '~/utils/message';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'AUTH_REQUEST') {
    handleAuth(msg.payload).then(sendResponse);
    return true;
  }

  if (msg.type === 'API_REQUEST') {
    forwardToAPI(msg.payload).then(sendResponse);
    return true;
  }
});

async function handleAuth(payload: any) {
  const { action, token } = payload;

  if (action === 'login') {
    await chrome.storage.local.set({ authToken: token });
    return { success: true };
  }

  if (action === 'logout') {
    await chrome.storage.local.remove('authToken');
    return { success: true };
  }

  if (action === 'getToken') {
    const result = await chrome.storage.local.get('authToken');
    return { token: result.authToken };
  }
}

async function forwardToAPI(payload: any) {
  const result = await chrome.storage.local.get('authToken');
  const token = result.authToken;

  const response = await fetch(payload.url, {
    method: payload.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: payload.body ? JSON.stringify(payload.body) : undefined
  });

  return {
    status: response.status,
    data: await response.json()
  };
}
```

### 1.5 Popup UI: Expert Search (popup/App.vue)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useStorage } from '@vueuse/core';

const loading = ref(false);
const experts = ref<Expert[]>([]);
const selectedExpert = ref<Expert | null>(null);
const currentContext = ref<CodeContext | null>(null);

async function loadExperts() {
  loading.value = true;
  try {
    const response = await sendMessage({
      type: 'API_REQUEST',
      payload: {
        url: '/api/experts',
        method: 'GET'
      }
    });
    experts.value = response.data;
  } finally {
    loading.value = false;
  }
}

async function captureAndRequest() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id!, { type: 'CAPTURE_CONTEXT' });

  if (response.success) {
    currentContext.value = response;
    // Send to backend for matching
    await sendMessage({
      type: 'API_REQUEST',
      payload: {
        url: '/api/sessions/request',
        method: 'POST',
        body: { context: response }
      }
    });
  }
}
</script>

<template>
  <div class="popup">
    <header>
      <h1>Call an Expert</h1>
      <button @click="captureAndRequest">Capture Context</button>
    </header>

    <main v-if="!selectedExpert">
      <div v-if="currentContext" class="context-preview">
        <p>Context captured from {{ currentContext.ide }}</p>
      </div>

      <div v-if="loading">Loading experts...</div>
      <div v-else class="expert-list">
        <div
          v-for="expert in experts"
          :key="expert.id"
          class="expert-card"
          @click="selectedExpert = expert"
        >
          <img :src="expert.avatar" :alt="expert.name" />
          <div>
            <h3>{{ expert.name }}</h3>
            <p>{{ expert.skills.join(', ') }}</p>
            <span>${{ expert.rate }}/session</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
```

### 1.6 Shared Types (types/index.ts)

```typescript
export interface CodeContext {
  success: boolean;
  ide?: string;
  html?: string;
  selection?: string;
  fileTree?: any;
  url?: string;
  timestamp?: number;
}

export interface Expert {
  id: string;
  name: string;
  avatar: string;
  skills: string[];
  rate: number;
  rating: number;
  available: boolean;
}

export interface Session {
  id: string;
  expertId: string;
  userId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  context?: CodeContext;
  roomUrl?: string;
}
```

## Success Criteria

- [ ] Extension loads without errors in Chrome
- [ ] Content script detects Cursor/Replit/v0/Lovable
- [ ] Code capture sends data to service worker
- [ ] Service worker can authenticate with backend
- [ ] Popup UI displays expert list from API
- [ ] No file overlap with other phases

## Conflict Prevention

- Extension files under `/extensions/` exclusive
- Types in `/extensions/src/types/` not duplicated elsewhere
- Backend schema created separately in Phase 02
