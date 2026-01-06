/**
 * Content Script for Last20 Chrome Extension
 *
 * Runs in the context of web pages to capture:
 * - Page context (URL, title, meta information)
 * - Visible error messages and console errors
 * - Code snippets from coding tools
 * - AI tool detection (Cursor, Replit, v0, etc.)
 */

// Types for page context
interface PageContext {
  url: string
  title: string
  timestamp: string
  metaDescription: string | null
  detectedTool: DetectedTool | null
  errors: PageError[]
  codeSnippets: CodeSnippet[]
  selectedText: string | null
}

interface DetectedTool {
  name: string
  type: 'ide' | 'ai-assistant' | 'no-code' | 'hosting' | 'other'
  version?: string
}

interface PageError {
  type: 'console' | 'dom' | 'network'
  message: string
  source?: string
  lineNumber?: number
}

interface CodeSnippet {
  language: string | null
  code: string
  source: 'selection' | 'code-block' | 'editor'
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

// Tool detection patterns
const TOOL_PATTERNS: Record<string, DetectedTool> = {
  'cursor.sh': { name: 'Cursor', type: 'ide' },
  'cursor.com': { name: 'Cursor', type: 'ide' },
  'replit.com': { name: 'Replit', type: 'ide' },
  'repl.it': { name: 'Replit', type: 'ide' },
  'v0.dev': { name: 'v0', type: 'ai-assistant' },
  'vercel.com/v0': { name: 'v0', type: 'ai-assistant' },
  'chat.openai.com': { name: 'ChatGPT', type: 'ai-assistant' },
  'chatgpt.com': { name: 'ChatGPT', type: 'ai-assistant' },
  'claude.ai': { name: 'Claude', type: 'ai-assistant' },
  'github.com': { name: 'GitHub', type: 'other' },
  'github.dev': { name: 'GitHub Codespaces', type: 'ide' },
  'codespaces.github.com': { name: 'GitHub Codespaces', type: 'ide' },
  'codesandbox.io': { name: 'CodeSandbox', type: 'ide' },
  'stackblitz.com': { name: 'StackBlitz', type: 'ide' },
  'codepen.io': { name: 'CodePen', type: 'ide' },
  'jsfiddle.net': { name: 'JSFiddle', type: 'ide' },
  'glitch.com': { name: 'Glitch', type: 'ide' },
  'bolt.new': { name: 'Bolt', type: 'ai-assistant' },
  'lovable.dev': { name: 'Lovable', type: 'ai-assistant' },
  'gptengineer.run': { name: 'GPT Engineer', type: 'ai-assistant' },
  'figma.com': { name: 'Figma', type: 'no-code' },
  'notion.so': { name: 'Notion', type: 'no-code' },
  'airtable.com': { name: 'Airtable', type: 'no-code' },
  'webflow.io': { name: 'Webflow', type: 'no-code' },
  'bubble.io': { name: 'Bubble', type: 'no-code' },
  'netlify.app': { name: 'Netlify', type: 'hosting' },
  'vercel.app': { name: 'Vercel', type: 'hosting' },
  'railway.app': { name: 'Railway', type: 'hosting' },
  'render.com': { name: 'Render', type: 'hosting' },
  'supabase.co': { name: 'Supabase', type: 'hosting' },
}

// Store captured console errors
const capturedErrors: PageError[] = []
const MAX_ERRORS = 10

/**
 * Detect if the current page is a known AI/coding tool
 */
function detectTool(): DetectedTool | null {
  const hostname = window.location.hostname
  const href = window.location.href

  // Check direct hostname matches
  for (const [pattern, tool] of Object.entries(TOOL_PATTERNS)) {
    if (hostname.includes(pattern) || href.includes(pattern)) {
      return tool
    }
  }

  // Check for VS Code Web
  if (document.querySelector('[data-vscode-context]') || hostname.includes('vscode.dev')) {
    return { name: 'VS Code Web', type: 'ide' }
  }

  // Check for Monaco Editor (used by many IDEs)
  if (document.querySelector('.monaco-editor')) {
    return { name: 'Monaco-based Editor', type: 'ide' }
  }

  // Check for CodeMirror (used by many IDEs)
  if (document.querySelector('.CodeMirror')) {
    return { name: 'CodeMirror-based Editor', type: 'ide' }
  }

  return null
}

/**
 * Extract error messages visible on the page
 */
function extractDomErrors(): PageError[] {
  const errors: PageError[] = []
  const errorSelectors = [
    // Generic error patterns
    '.error',
    '.error-message',
    '.error-text',
    '[class*="error"]',
    '[data-error]',
    '[role="alert"]',
    // Stack traces
    '.stack-trace',
    '.stacktrace',
    'pre.error',
    // Console-like outputs
    '.console-error',
    '.terminal-error',
    // Framework-specific
    '.next-error-h1', // Next.js
    '[data-nextjs-dialog]', // Next.js error overlay
    '.react-error-overlay', // React error boundary
    '#webpack-dev-server-client-overlay', // Webpack
    '.vite-error-overlay', // Vite
  ]

  for (const selector of errorSelectors) {
    try {
      const elements = document.querySelectorAll(selector)
      elements.forEach((element) => {
        const text = (element as HTMLElement).innerText?.trim()
        if (text && text.length > 10 && text.length < 2000) {
          // Avoid duplicates
          const isDuplicate = errors.some((e) => e.message === text)
          if (!isDuplicate && errors.length < MAX_ERRORS) {
            errors.push({
              type: 'dom',
              message: text,
              source: selector,
            })
          }
        }
      })
    } catch {
      // Selector might be invalid, skip
    }
  }

  return errors
}

/**
 * Extract code snippets from the page
 */
function extractCodeSnippets(): CodeSnippet[] {
  const snippets: CodeSnippet[] = []
  const MAX_SNIPPETS = 5
  const MAX_CODE_LENGTH = 5000

  // Get selected text first
  const selection = window.getSelection()?.toString().trim()
  if (selection && selection.length > 10) {
    snippets.push({
      language: detectCodeLanguage(selection),
      code: selection.substring(0, MAX_CODE_LENGTH),
      source: 'selection',
    })
  }

  // Look for code blocks
  const codeElements = document.querySelectorAll('pre code, code.hljs, .monaco-editor .view-lines')

  codeElements.forEach((element) => {
    if (snippets.length >= MAX_SNIPPETS) return

    const code = (element as HTMLElement).innerText?.trim()
    if (code && code.length > 20 && code.length < MAX_CODE_LENGTH) {
      // Try to detect language from class names
      const classes = element.className.split(' ')
      let language: string | null = null

      for (const cls of classes) {
        if (cls.startsWith('language-')) {
          language = cls.replace('language-', '')
          break
        }
        if (cls.startsWith('hljs-')) {
          continue
        }
        // Check for direct language class names
        const langPatterns = ['javascript', 'typescript', 'python', 'java', 'rust', 'go', 'ruby', 'php', 'css', 'html', 'jsx', 'tsx', 'json']
        if (langPatterns.includes(cls.toLowerCase())) {
          language = cls.toLowerCase()
          break
        }
      }

      // Avoid duplicates
      const isDuplicate = snippets.some((s) => s.code === code)
      if (!isDuplicate) {
        snippets.push({
          language: language || detectCodeLanguage(code),
          code: code.substring(0, MAX_CODE_LENGTH),
          source: 'code-block',
        })
      }
    }
  })

  return snippets
}

/**
 * Simple heuristic to detect programming language from code content
 */
function detectCodeLanguage(code: string): string | null {
  const patterns: Record<string, RegExp[]> = {
    typescript: [/interface\s+\w+/, /type\s+\w+\s*=/, /:\s*(string|number|boolean|any)\b/, /<[A-Z]\w*>/],
    javascript: [/const\s+\w+\s*=/, /function\s+\w+\(/, /=>\s*{/, /require\(['"]/, /import\s+.*from/],
    python: [/def\s+\w+\(/, /import\s+\w+/, /from\s+\w+\s+import/, /if\s+__name__\s*==/, /:\s*$/m],
    rust: [/fn\s+\w+\(/, /let\s+mut\s+/, /impl\s+\w+/, /pub\s+(fn|struct|enum)/, /->\s*\w+/],
    go: [/func\s+\w+\(/, /package\s+\w+/, /import\s+"/, /var\s+\w+\s+\w+/, /:=\s*/],
    java: [/public\s+class/, /private\s+(static\s+)?\w+/, /System\.out\.println/, /new\s+\w+\(/],
    html: [/<html/, /<div/, /<span/, /<\/\w+>/, /class=["']/],
    css: [/{\s*[\w-]+\s*:/, /@media/, /\.[\w-]+\s*{/, /#[\w-]+\s*{/],
    json: [/^\s*{[\s\S]*"[\w-]+":\s*/, /^\s*\[[\s\S]*\]s*$/],
    sql: [/SELECT\s+/i, /FROM\s+/i, /WHERE\s+/i, /INSERT\s+INTO/i, /CREATE\s+TABLE/i],
  }

  for (const [lang, regexes] of Object.entries(patterns)) {
    let matches = 0
    for (const regex of regexes) {
      if (regex.test(code)) {
        matches++
      }
    }
    if (matches >= 2) {
      return lang
    }
  }

  return null
}

/**
 * Get meta description from the page
 */
function getMetaDescription(): string | null {
  const meta = document.querySelector('meta[name="description"]')
  return meta?.getAttribute('content') || null
}

/**
 * Get selected text on the page
 */
function getSelectedText(): string | null {
  const selection = window.getSelection()?.toString().trim()
  return selection && selection.length > 0 ? selection : null
}

/**
 * Capture the full page context
 */
function capturePageContext(): PageContext {
  return {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    metaDescription: getMetaDescription(),
    detectedTool: detectTool(),
    errors: [...capturedErrors, ...extractDomErrors()].slice(0, MAX_ERRORS),
    codeSnippets: extractCodeSnippets(),
    selectedText: getSelectedText(),
  }
}

/**
 * Set up console error capturing
 * Note: This can only capture errors after the content script loads
 */
function setupErrorCapturing(): void {
  // Listen for error events on the window
  window.addEventListener('error', (event) => {
    if (capturedErrors.length < MAX_ERRORS) {
      capturedErrors.push({
        type: 'console',
        message: event.message || 'Unknown error',
        source: event.filename,
        lineNumber: event.lineno,
      })
    }
  })

  // Listen for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (capturedErrors.length < MAX_ERRORS) {
      const message = event.reason?.message || event.reason?.toString() || 'Unhandled promise rejection'
      capturedErrors.push({
        type: 'console',
        message,
      })
    }
  })
}

/**
 * Handle messages from the popup or background script
 */
function handleMessage(
  request: MessageRequest,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
): boolean {
  switch (request.type) {
    case 'GET_PAGE_CONTEXT':
      try {
        const context = capturePageContext()
        sendResponse({ success: true, data: context })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to capture page context'
        sendResponse({ success: false, error: errorMessage })
      }
      return true

    case 'GET_SELECTED_TEXT':
      try {
        const selectedText = getSelectedText()
        sendResponse({ success: true, data: { selectedText } })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get selected text'
        sendResponse({ success: false, error: errorMessage })
      }
      return true

    case 'GET_ERRORS':
      try {
        const errors = [...capturedErrors, ...extractDomErrors()].slice(0, MAX_ERRORS)
        sendResponse({ success: true, data: { errors } })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get errors'
        sendResponse({ success: false, error: errorMessage })
      }
      return true

    case 'GET_CODE_SNIPPETS':
      try {
        const snippets = extractCodeSnippets()
        sendResponse({ success: true, data: { snippets } })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get code snippets'
        sendResponse({ success: false, error: errorMessage })
      }
      return true

    case 'PING':
      sendResponse({ success: true, data: { status: 'alive', timestamp: Date.now() } })
      return true

    default:
      // Unknown message type, don't respond
      return false
  }
}

/**
 * Initialize the content script
 */
function initialize(): void {
  // Set up error capturing
  setupErrorCapturing()

  // Listen for messages
  chrome.runtime.onMessage.addListener(handleMessage)

  // Notify that content script is ready (for debugging)
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    // Content script loaded successfully
  }
}

// Initialize when the document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}

// Export for testing (if needed)
export {
  capturePageContext,
  detectTool,
  extractDomErrors,
  extractCodeSnippets,
  detectCodeLanguage,
  getMetaDescription,
  getSelectedText,
}
