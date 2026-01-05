'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AvailabilityToggleProps {
  expertId: string
  initialAvailable: boolean
}

/**
 * AvailabilityToggle component allows experts to toggle their availability status.
 * Uses optimistic updates for instant feedback with server-side persistence.
 */
export default function AvailabilityToggle({
  expertId,
  initialAvailable,
}: AvailabilityToggleProps) {
  const [available, setAvailable] = useState(initialAvailable)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async () => {
    const newAvailable = !available
    setError(null)

    // Optimistic update
    setAvailable(newAvailable)

    startTransition(async () => {
      try {
        const supabase = createClient()

        const { error: updateError } = await supabase
          .from('experts')
          .update({ available: newAvailable })
          .eq('id', expertId)

        if (updateError) {
          // Revert on error
          setAvailable(!newAvailable)
          setError('Failed to update availability. Please try again.')
        }
      } catch {
        // Revert on error
        setAvailable(!newAvailable)
        setError('Failed to update availability. Please try again.')
      }
    })
  }

  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-secondary-900">Availability</h3>
          <p className="mt-1 text-sm text-secondary-500">
            {available
              ? 'You are visible to users looking for help'
              : 'You are hidden from new session requests'}
          </p>
        </div>

        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            available ? 'bg-green-500' : 'bg-secondary-300'
          } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          role="switch"
          aria-checked={available}
          aria-label="Toggle availability"
        >
          <span className="sr-only">Toggle availability</span>
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              available ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Status indicator */}
      <div className="mt-4 flex items-center gap-2">
        <span
          className={`flex h-3 w-3 ${available ? '' : 'opacity-50'}`}
        >
          {available && (
            <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-green-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-3 w-3 rounded-full ${
              available ? 'bg-green-500' : 'bg-secondary-400'
            }`}
          />
        </span>
        <span
          className={`text-sm font-medium ${
            available ? 'text-green-700' : 'text-secondary-500'
          }`}
        >
          {available ? 'Available for sessions' : 'Not accepting sessions'}
        </span>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {isPending && (
        <div className="mt-3 flex items-center gap-2 text-sm text-secondary-500">
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
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
          Updating...
        </div>
      )}
    </div>
  )
}
