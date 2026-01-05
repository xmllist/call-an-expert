'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * SessionTimer Component
 *
 * Displays a countdown timer for session duration.
 * Handles warnings at 2 minutes and auto-end at 0.
 */

interface SessionTimerProps {
  /** Total session duration in minutes */
  durationMinutes: number
  /** When the session started (ISO string or Date) */
  startedAt: string | Date | null
  /** Callback when session time is up */
  onTimeUp?: () => void
  /** Callback when warning threshold is reached (default 2 minutes) */
  onWarning?: () => void
  /** Warning threshold in seconds (default 120) */
  warningThresholdSeconds?: number
  /** Whether to show extended format (HH:MM:SS vs MM:SS) */
  showHours?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Format seconds into a display string
 */
function formatTime(totalSeconds: number, showHours: boolean = false): string {
  if (totalSeconds < 0) totalSeconds = 0

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (showHours || hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

export default function SessionTimer({
  durationMinutes,
  startedAt,
  onTimeUp,
  onWarning,
  warningThresholdSeconds = 120,
  showHours = false,
  className = '',
}: SessionTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [hasWarned, setHasWarned] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)

  // Calculate remaining time
  const calculateRemaining = useCallback(() => {
    if (!startedAt) return null

    const startTime = new Date(startedAt).getTime()
    const endTime = startTime + durationMinutes * 60 * 1000
    const now = Date.now()
    const remaining = Math.floor((endTime - now) / 1000)

    return remaining
  }, [startedAt, durationMinutes])

  // Initialize and update timer
  useEffect(() => {
    if (!startedAt) {
      setRemainingSeconds(durationMinutes * 60)
      return
    }

    // Initial calculation
    const initial = calculateRemaining()
    setRemainingSeconds(initial)

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateRemaining()
      setRemainingSeconds(remaining)

      if (remaining !== null) {
        // Check for warning
        if (
          remaining <= warningThresholdSeconds &&
          remaining > 0 &&
          !hasWarned
        ) {
          setHasWarned(true)
          onWarning?.()
        }

        // Check for time up
        if (remaining <= 0 && !hasEnded) {
          setHasEnded(true)
          onTimeUp?.()
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [
    startedAt,
    durationMinutes,
    calculateRemaining,
    warningThresholdSeconds,
    hasWarned,
    hasEnded,
    onWarning,
    onTimeUp,
  ])

  // Determine status and color
  const getStatusColor = () => {
    if (remainingSeconds === null) return 'text-secondary-500'
    if (remainingSeconds <= 0) return 'text-red-600'
    if (remainingSeconds <= warningThresholdSeconds) return 'text-yellow-600'
    return 'text-secondary-700'
  }

  const getBackgroundColor = () => {
    if (remainingSeconds === null) return 'bg-secondary-100'
    if (remainingSeconds <= 0) return 'bg-red-100'
    if (remainingSeconds <= warningThresholdSeconds) return 'bg-yellow-100'
    return 'bg-secondary-100'
  }

  const displayTime =
    remainingSeconds !== null ? formatTime(remainingSeconds, showHours) : '--:--'

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl ${getBackgroundColor()} ${className}`}
    >
      {/* Timer icon */}
      <svg
        className={`h-5 w-5 ${getStatusColor()}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {/* Time display */}
      <span className={`font-mono text-lg font-semibold ${getStatusColor()}`}>
        {displayTime}
      </span>

      {/* Status label */}
      {remainingSeconds !== null && remainingSeconds <= 0 && (
        <span className="text-xs font-medium text-red-600">Session ended</span>
      )}
      {remainingSeconds !== null &&
        remainingSeconds > 0 &&
        remainingSeconds <= warningThresholdSeconds && (
          <span className="text-xs font-medium text-yellow-600 animate-pulse">
            Ending soon
          </span>
        )}
    </div>
  )
}

/**
 * Compact timer for use in headers/toolbars
 */
interface CompactTimerProps {
  remainingSeconds: number | null
  warningThresholdSeconds?: number
  className?: string
}

export function CompactTimer({
  remainingSeconds,
  warningThresholdSeconds = 120,
  className = '',
}: CompactTimerProps) {
  const getStatusColor = () => {
    if (remainingSeconds === null) return 'text-secondary-500'
    if (remainingSeconds <= 0) return 'text-red-500'
    if (remainingSeconds <= warningThresholdSeconds) return 'text-yellow-500'
    return 'text-secondary-600'
  }

  const displayTime =
    remainingSeconds !== null ? formatTime(remainingSeconds) : '--:--'

  return (
    <span className={`font-mono font-medium ${getStatusColor()} ${className}`}>
      {displayTime}
    </span>
  )
}
