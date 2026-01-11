// Content script: Code capture from AI IDEs

import type { CodeContext, IDEType } from '../src/types';

const DETECT_SELECTORS: Record<string, string> = {
  cursor: '.monaco-editor',
  replit: '.replit-ref',
  v0: 'div[data-state="open"]',
  lovable: '[data-lovable="true"]'
};

function detectIDE(): IDEType | null {
  for (const [ide, selector] of Object.entries(DETECT_SELECTORS)) {
    if (document.querySelector(selector)) {
      return ide as IDEType;
    }
  }
  return null;
}

function captureCodeContext(): CodeContext {
  return {
    success: true,
    ide: detectIDE(),
    html: document.documentElement.outerHTML,
    selection: window.getSelection()?.toString() || null,
    fileTree: null,
    url: window.location.href,
    timestamp: Date.now()
  };
}

export default defineContentScript({
  matches: ['<all_urls>'],
  excludeMatches: ['*://localhost:*/*'],
  main() {
    browser.runtime.onMessage.addListener((
      message: { type: string },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => {
      if (message.type === 'CAPTURE_CONTEXT') {
        sendResponse(captureCodeContext());
        return false;
      }
      if (message.type === 'DETECT_IDE') {
        sendResponse({ ide: detectIDE() });
        return false;
      }
      return false;
    });
  },
});
