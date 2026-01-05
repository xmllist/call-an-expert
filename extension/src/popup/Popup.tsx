import { useState, useCallback, useEffect } from 'react'

interface FormData {
  title: string
  description: string
}

interface PageContext {
  url: string
  title: string
  timestamp: string
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

export default function Popup() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
  })
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false)
  const [pageContext, setPageContext] = useState<PageContext | null>(null)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Get current page context on mount
  useEffect(() => {
    const getPageContext = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab && tab.url && tab.title) {
          setPageContext({
            url: tab.url,
            title: tab.title,
            timestamp: new Date().toISOString(),
          })
        }
      } catch (error) {
        // Silently fail if we can't get page context
      }
    }
    getPageContext()
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({ ...prev, [name]: value }))
    },
    []
  )

  const captureScreenshot = useCallback(async () => {
    setIsCapturingScreenshot(true)
    setErrorMessage(null)

    try {
      // Use chrome.tabs.captureVisibleTab to capture the current tab
      const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
        format: 'png',
        quality: 90,
      })
      setScreenshot(dataUrl)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to capture screenshot'
      setErrorMessage(errorMsg)
    } finally {
      setIsCapturingScreenshot(false)
    }
  }, [])

  const removeScreenshot = useCallback(() => {
    setScreenshot(null)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitStatus('submitting')
      setErrorMessage(null)

      try {
        // Send message to background script to handle API communication
        const response = await chrome.runtime.sendMessage({
          type: 'SUBMIT_HELP_REQUEST',
          payload: {
            title: formData.title,
            description: formData.description,
            screenshot: screenshot,
            context: pageContext,
          },
        })

        if (response?.success) {
          setSubmitStatus('success')
          // Reset form after successful submission
          setFormData({ title: '', description: '' })
          setScreenshot(null)
        } else {
          setSubmitStatus('error')
          setErrorMessage(response?.error || 'Failed to submit help request')
        }
      } catch (error) {
        setSubmitStatus('error')
        const errorMsg = error instanceof Error ? error.message : 'Failed to submit help request'
        setErrorMessage(errorMsg)
      }
    },
    [formData, screenshot, pageContext]
  )

  const isFormValid = formData.title.trim() && formData.description.trim()

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="logo-container">
          <img src="/icons/icon32.png" alt="Last20" className="logo" />
          <h1 className="title">Last20</h1>
        </div>
        <p className="subtitle">Get expert help in 15 minutes</p>
      </header>

      {submitStatus === 'success' ? (
        <div className="success-message">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2>Help Request Submitted!</h2>
          <p>We&apos;re matching you with an expert. Check your dashboard for updates.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSubmitStatus('idle')
            }}
          >
            Submit Another
          </button>
          <a
            href={`${import.meta.env.VITE_APP_URL || 'http://localhost:3000'}/dashboard`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View Dashboard
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="help-form">
          {pageContext && (
            <div className="context-info">
              <span className="context-label">Current page:</span>
              <span className="context-value" title={pageContext.url}>
                {pageContext.title}
              </span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">What&apos;s the issue?</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., API not returning data"
              className="form-input"
              required
              disabled={submitStatus === 'submitting'}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Describe what you&apos;ve tried</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="What have you tried? What error messages are you seeing?"
              className="form-textarea"
              rows={4}
              required
              disabled={submitStatus === 'submitting'}
            />
          </div>

          <div className="screenshot-section">
            <label>Screenshot (optional)</label>
            {screenshot ? (
              <div className="screenshot-preview">
                <img src={screenshot} alt="Captured screenshot" />
                <button
                  type="button"
                  className="remove-screenshot"
                  onClick={removeScreenshot}
                  disabled={submitStatus === 'submitting'}
                  aria-label="Remove screenshot"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-screenshot"
                onClick={captureScreenshot}
                disabled={isCapturingScreenshot || submitStatus === 'submitting'}
              >
                {isCapturingScreenshot ? (
                  <>
                    <span className="spinner" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Capture Screenshot
                  </>
                )}
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="error-message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-submit"
            disabled={!isFormValid || submitStatus === 'submitting'}
          >
            {submitStatus === 'submitting' ? (
              <>
                <span className="spinner" />
                Finding Experts...
              </>
            ) : (
              'Find an Expert'
            )}
          </button>
        </form>
      )}

      <footer className="popup-footer">
        <a
          href={`${import.meta.env.VITE_APP_URL || 'http://localhost:3000'}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by Last20
        </a>
      </footer>
    </div>
  )
}
