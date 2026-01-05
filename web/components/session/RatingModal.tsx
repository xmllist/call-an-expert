'use client'

import { useState, useEffect, useCallback } from 'react'
import StarRating, { RATING_LABELS } from '@/components/ui/StarRating'

/**
 * RatingModal Component
 *
 * Modal component for rating a completed session.
 * Displayed after a session ends to collect feedback from both
 * the user and the expert.
 */

interface RatingModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Session ID to rate */
  sessionId: string
  /** The person being rated */
  ratee: {
    id: string
    name: string
    avatarUrl?: string | null
    isExpert: boolean
  }
  /** Callback after successful rating submission */
  onSuccess?: () => void
}

interface RatingState {
  score: number
  comment: string
}

export default function RatingModal({
  isOpen,
  onClose,
  sessionId,
  ratee,
  onSuccess,
}: RatingModalProps) {
  const [rating, setRating] = useState<RatingState>({
    score: 0,
    comment: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRating({ score: 0, comment: '' })
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose()
      }
    },
    [isOpen, onClose, loading]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleScoreChange = (score: number) => {
    setRating((prev) => ({ ...prev, score }))
    setError(null)
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRating((prev) => ({ ...prev, comment: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate score
    if (rating.score < 1 || rating.score > 5) {
      setError('Please select a rating')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          score: rating.score,
          comment: rating.comment.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          setError('You have already rated this session')
        } else if (response.status === 400) {
          setError(data.message || 'Invalid rating submission')
        } else if (response.status === 401) {
          setError('Please log in to submit a rating')
        } else {
          setError(data.message || 'Failed to submit rating')
        }
        setLoading(false)
        return
      }

      // Success!
      setSuccess(true)
      setLoading(false)

      // Call onSuccess callback after short delay
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleSkip = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-secondary-100">
          <h2 className="text-xl font-semibold text-secondary-900">
            Rate Your Session
          </h2>
          <p className="mt-1 text-sm text-secondary-500">
            How was your experience with {ratee.name}?
          </p>
        </div>

        {success ? (
          /* Success state */
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              Thanks for your feedback!
            </h3>
            <p className="text-sm text-secondary-500">
              Your rating helps improve the experience for everyone.
            </p>
          </div>
        ) : (
          /* Rating form */
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6 space-y-6">
              {/* Ratee avatar and name */}
              <div className="flex flex-col items-center gap-3">
                {ratee.avatarUrl ? (
                  <img
                    src={ratee.avatarUrl}
                    alt={ratee.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-2xl font-semibold">
                    {ratee.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-center">
                  <p className="font-medium text-secondary-900">{ratee.name}</p>
                  <p className="text-xs text-secondary-500">
                    {ratee.isExpert ? 'Expert' : 'User'}
                  </p>
                </div>
              </div>

              {/* Star rating */}
              <div className="flex flex-col items-center gap-2">
                <StarRating
                  value={rating.score}
                  onChange={handleScoreChange}
                  size="xl"
                  className="justify-center"
                />
                {rating.score > 0 && (
                  <p className="text-sm font-medium text-secondary-700 animate-in fade-in duration-200">
                    {RATING_LABELS[rating.score]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label
                  htmlFor="comment"
                  className="block text-sm font-medium text-secondary-700 mb-1"
                >
                  Add a comment (optional)
                </label>
                <textarea
                  id="comment"
                  rows={3}
                  value={rating.comment}
                  onChange={handleCommentChange}
                  disabled={loading}
                  maxLength={1000}
                  className="block w-full rounded-lg border border-secondary-300 px-4 py-3 text-secondary-900 placeholder-secondary-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none text-sm"
                  placeholder={`What did you ${rating.score >= 4 ? 'like' : 'think'} about the session?`}
                />
                <p className="mt-1 text-xs text-secondary-500 text-right">
                  {rating.comment.length}/1000
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-100 flex gap-3">
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="flex-1 rounded-lg border border-secondary-300 bg-white px-4 py-2.5 text-sm font-semibold text-secondary-700 shadow-sm hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={loading || rating.score === 0}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Rating'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/**
 * Hook to manage rating modal state
 */
export function useRatingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [ratee, setRatee] = useState<{
    id: string
    name: string
    avatarUrl?: string | null
    isExpert: boolean
  } | null>(null)

  const openRatingModal = (
    sessionId: string,
    rateeData: {
      id: string
      name: string
      avatarUrl?: string | null
      isExpert: boolean
    }
  ) => {
    setSessionId(sessionId)
    setRatee(rateeData)
    setIsOpen(true)
  }

  const closeRatingModal = () => {
    setIsOpen(false)
    // Clear data after animation
    setTimeout(() => {
      setSessionId(null)
      setRatee(null)
    }, 200)
  }

  return {
    isOpen,
    sessionId,
    ratee,
    openRatingModal,
    closeRatingModal,
  }
}

/**
 * Pre-built rating prompt component that appears after session
 */
interface RatingPromptProps {
  /** Session ID */
  sessionId: string
  /** Person being rated */
  ratee: {
    id: string
    name: string
    avatarUrl?: string | null
    isExpert: boolean
  }
  /** Callback when rating is submitted */
  onComplete?: () => void
  /** Callback when user dismisses */
  onDismiss?: () => void
}

export function RatingPrompt({
  sessionId,
  ratee,
  onComplete,
  onDismiss,
}: RatingPromptProps) {
  const [showModal, setShowModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const handleOpenModal = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  const handleSuccess = () => {
    setShowModal(false)
    setDismissed(true)
    onComplete?.()
  }

  if (dismissed) return null

  return (
    <>
      <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {ratee.avatarUrl ? (
              <img
                src={ratee.avatarUrl}
                alt={ratee.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold">
                {ratee.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-secondary-900">
              How was your session with {ratee.name}?
            </h4>
            <p className="mt-0.5 text-xs text-secondary-500">
              Your feedback helps improve the experience
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleOpenModal}
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
              >
                Rate Now
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-secondary-300 bg-white px-3 py-1.5 text-xs font-medium text-secondary-600 hover:bg-secondary-50 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-secondary-400 hover:text-secondary-600"
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <RatingModal
        isOpen={showModal}
        onClose={handleCloseModal}
        sessionId={sessionId}
        ratee={ratee}
        onSuccess={handleSuccess}
      />
    </>
  )
}
