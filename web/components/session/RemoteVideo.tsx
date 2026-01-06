'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * RemoteVideo Component
 *
 * Displays a remote video stream from WebRTC peer connection.
 * Handles stream attachment, error states, and loading indicators.
 */

interface RemoteVideoProps {
  /** The MediaStream to display */
  stream: MediaStream | null
  /** Whether the video is currently loading */
  isLoading?: boolean
  /** Label to display (e.g., "User's Screen", "Expert's Screen") */
  label?: string
  /** Whether to show fullscreen button */
  showFullscreen?: boolean
  /** Callback when fullscreen is toggled */
  onFullscreenToggle?: () => void
  /** Additional class names */
  className?: string
}

export default function RemoteVideo({
  stream,
  isLoading = false,
  label,
  showFullscreen = true,
  onFullscreenToggle,
  className = '',
}: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Attach stream to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (stream) {
      video.srcObject = stream
      setError(null)

      // Attempt to play
      video.play().catch((err) => {
        // Autoplay may be blocked - user interaction required
        if (err.name === 'NotAllowedError') {
          setError('Click to enable video playback')
        } else {
          setError('Failed to play video')
        }
      })
    } else {
      video.srcObject = null
      setIsPlaying(false)
    }

    return () => {
      video.srcObject = null
    }
  }, [stream])

  // Handle video events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlaying = () => {
      setIsPlaying(true)
      setError(null)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleError = () => {
      setError('Video playback error')
      setIsPlaying(false)
    }

    video.addEventListener('playing', handlePlaying)
    video.addEventListener('pause', handlePause)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('error', handleError)
    }
  }, [])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Click to play handler
  const handleClick = () => {
    const video = videoRef.current
    if (video && error === 'Click to enable video playback') {
      video.play().then(() => {
        setError(null)
        setIsPlaying(true)
      }).catch(() => {
        setError('Failed to play video')
      })
    }
  }

  // Toggle fullscreen
  const handleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await container.requestFullscreen()
      }
      onFullscreenToggle?.()
    } catch {
      // Fullscreen not supported or denied
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-secondary-900 rounded-xl overflow-hidden ${className}`}
      onClick={handleClick}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-contain"
      />

      {/* Loading state */}
      {isLoading && !stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary-900">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary-600 border-t-primary-500" />
          <p className="mt-4 text-sm text-secondary-400">Connecting...</p>
        </div>
      )}

      {/* No stream state */}
      {!isLoading && !stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary-900">
          <svg
            className="h-16 w-16 text-secondary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-4 text-sm text-secondary-400">
            Waiting for screen share...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary-900/80">
          <svg
            className="h-12 w-12 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="mt-2 text-sm text-secondary-300">{error}</p>
        </div>
      )}

      {/* Overlay controls */}
      {stream && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between">
            {/* Label */}
            {label && (
              <span className="text-sm font-medium text-white">{label}</span>
            )}

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {isPlaying && (
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              )}

              {/* Fullscreen button */}
              {showFullscreen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFullscreen()
                  }}
                  className="p-2 rounded-lg bg-black/30 text-white hover:bg-black/50 transition-colors"
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                      />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Connection quality indicator component
 */
interface ConnectionQualityProps {
  /** Round trip time in seconds */
  rtt: number | null
  /** Packet loss count */
  packetsLost: number
  /** Frame rate */
  frameRate: number | null
}

export function ConnectionQuality({
  rtt,
  packetsLost,
  frameRate,
}: ConnectionQualityProps) {
  // Determine quality level
  let quality: 'excellent' | 'good' | 'poor' | 'unknown' = 'unknown'
  let color = 'text-secondary-400'

  if (rtt !== null) {
    if (rtt < 0.1 && packetsLost < 10) {
      quality = 'excellent'
      color = 'text-green-500'
    } else if (rtt < 0.3 && packetsLost < 50) {
      quality = 'good'
      color = 'text-yellow-500'
    } else {
      quality = 'poor'
      color = 'text-red-500'
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Quality bars */}
      <div className="flex items-end gap-0.5 h-3">
        <div className={`w-1 h-1 rounded-sm ${quality !== 'unknown' ? color.replace('text-', 'bg-') : 'bg-secondary-400'}`} />
        <div className={`w-1 h-2 rounded-sm ${quality === 'excellent' || quality === 'good' ? color.replace('text-', 'bg-') : 'bg-secondary-600'}`} />
        <div className={`w-1 h-3 rounded-sm ${quality === 'excellent' ? color.replace('text-', 'bg-') : 'bg-secondary-600'}`} />
      </div>

      {/* Stats */}
      <span className={color}>
        {rtt !== null ? `${Math.round(rtt * 1000)}ms` : '--'}
        {frameRate !== null && ` / ${Math.round(frameRate)}fps`}
      </span>
    </div>
  )
}
