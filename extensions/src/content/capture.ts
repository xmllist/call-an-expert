// Content script: Code capture for AI IDEs (Cursor, Replit, v0, Lovable)

import type { CodeContext, IDEType } from '../types';

/**
 * Detect which AI IDE the user is currently viewing
 */
export function detectIDE(): IDEType {
  const url = window.location.href;

  if (url.includes('cursor.sh')) return 'cursor';
  if (url.includes('replit.com')) return 'replit';
  if (url.includes('v0.dev')) return 'v0';
  if (url.includes('lovable.dev')) return 'lovable';

  return null;
}

/**
 * Capture the full page HTML
 */
export function capturePageHTML(): string {
  return document.documentElement.outerHTML;
}

/**
 * Get user's text selection
 */
export function getSelection(): string {
  const selection = window.getSelection();
  return selection?.toString() || '';
}

/**
 * Attempt to capture file tree structure (platform-specific)
 * Returns null if not accessible
 */
async function captureFileTree(): Promise<Record<string, unknown> | null> {
  const ide = detectIDE();

  switch (ide) {
    case 'cursor':
      return captureCursorFileTree();
    case 'replit':
      return captureReplitFileTree();
    case 'v0':
    case 'lovable':
      return captureLowCodeFileTree();
    default:
      return null;
  }
}

/**
 * Try to capture Cursor's file tree from the DOM
 */
function captureCursorFileTree(): Record<string, unknown> | null {
  const fileTreeElements = document.querySelectorAll('[data-testid="file-tree"]');
  const sidebar = document.querySelector('[class*="fileTree"], [class*="FileTree"]');

  if (fileTreeElements.length > 0 || sidebar) {
    return {
      source: 'dom',
      elementCount: fileTreeElements.length
    };
  }

  return null;
}

/**
 * Try to capture Replit's file tree from the DOM
 */
function captureReplitFileTree(): Record<string, unknown> | null {
  const sidePanel = document.querySelector('[class*="SidePanel"], [class*="file-panel"]');
  const fileBrowser = document.querySelector('[class*="FileBrowser"], [class*="Files"]');

  if (sidePanel || fileBrowser) {
    return {
      source: 'dom',
      elementCount: (sidePanel ? 1 : 0) + (fileBrowser ? 1 : 0)
    };
  }

  return null;
}

/**
 * Capture file info for v0/Lovable (simplified since these are low-code platforms)
 */
function captureLowCodeFileTree(): Record<string, unknown> | null {
  const mainContent = document.querySelector('main, [role="main"], [class*="preview"]');

  if (mainContent) {
    return {
      source: 'main-content',
      hasContent: mainContent.children.length > 0
    };
  }

  return null;
}

/**
 * Main function to capture code context from the current page
 */
export async function captureCodeContext(): Promise<CodeContext> {
  const ide = detectIDE();

  if (!ide) {
    return {
      success: false
    };
  }

  // Capture context in parallel
  const [pageHTML, selection, fileTree] = await Promise.all([
    Promise.resolve(capturePageHTML()),
    Promise.resolve(getSelection()),
    captureFileTree()
  ]);

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

/**
 * Listen for messages from the service worker
 */
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle capture context request
    if (message.type === 'CAPTURE_CONTEXT') {
      captureCodeContext()
        .then(sendResponse)
        .catch((error) => {
          console.error('Capture failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Async response
    }

    // Handle IDE detection request
    if (message.type === 'DETECT_IDE') {
      sendResponse({ ide: detectIDE() });
      return false;
    }

    return false;
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMessageListener);
} else {
  setupMessageListener();
}
