'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import RemoteVideo, { ConnectionQuality } from './RemoteVideo'
import {
  startScreenShare,
  createManagedPeerConnection,
  getConnectionStats,
  parseConnectionStats,
  isWebRTCSupported,
  getBrowserWarnings,
  type PeerConnectionManager,
  type ScreenShareQuality,
} from '@/lib/webrtc/peer'
import {
  getSocket,
  sendWebRTCOffer,
  sendWebRTCAnswer,
  sendIceCandidate,
  subscribeToWebRTCEvents,
} from '@/lib/socket/client'

/**
 * ScreenShare Component
 *
 * Manages WebRTC screen sharing between session participants.
 * Uses RTCPeerConnection for peer-to-peer video streaming and
 * Socket.io for WebRTC signaling (offer/answer/ICE candidates).
 */

interface ScreenShareProps {
  sessionId: string
  currentUserId: string
  userRole: 'user' | 'expert'
  /** The other participant's user ID for signaling */
  remoteUserId: string | null
  /** Whether the current user is sharing their screen */
  isSharing?: boolean
  /** Callback when sharing state changes */
  onSharingChange?: (isSharing: boolean) => void
  /** Callback when an error occurs */
  onError?: (error: string) => void
  /** Screen share quality preset */
  quality?: ScreenShareQuality
  /** Whether the component is disabled */
  disabled?: boolean
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'failed' | 'closed'

export default function ScreenShare({
  sessionId,
  currentUserId,
  userRole,
  remoteUserId,
  isSharing: externalIsSharing,
  onSharingChange,
  onError,
  quality = 'auto',
  disabled = false,
}: ScreenShareProps) {
  // State
  const [isSharing, setIsSharing] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [browserWarnings, setBrowserWarnings] = useState<string[]>([])
  const [isSupported, setIsSupported] = useState(true)

  // Connection stats
  const [connectionStats, setConnectionStats] = useState<{
    rtt: number | null
    packetsLost: number
    frameRate: number | null
  }>({ rtt: null, packetsLost: 0, frameRate: null })

  // Refs
  const peerManagerRef = useRef<PeerConnectionManager | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([])
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check browser support on mount
  useEffect(() => {
    const supported = isWebRTCSupported()
    setIsSupported(supported)

    const warnings = getBrowserWarnings()
    setBrowserWarnings(warnings)

    if (!supported) {
      setError('WebRTC is not supported in your browser')
    }
  }, [])

  // Handle external sharing state changes
  useEffect(() => {
    if (externalIsSharing !== undefined && externalIsSharing !== isSharing) {
      if (externalIsSharing) {
        handleStartSharing()
      } else {
        handleStopSharing()
      }
    }
  }, [externalIsSharing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  // Process queued ICE candidates when remote description is set
  const processIceCandidateQueue = useCallback(async () => {
    const manager = peerManagerRef.current
    if (!manager) return

    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift()
      if (candidate) {
        try {
          await manager.addIceCandidate(candidate)
        } catch {
          // Ignore errors for invalid candidates
        }
      }
    }
  }, [])

  // Handle incoming WebRTC offer
  const handleOffer = useCallback(
    async (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
      if (data.fromUserId !== remoteUserId) return

      try {
        setConnectionState('connecting')

        // Create peer connection if needed
        if (!peerManagerRef.current) {
          peerManagerRef.current = createManagedPeerConnection({
            onIceCandidate: (candidate) => {
              if (remoteUserId) {
                sendIceCandidate(sessionId, remoteUserId, candidate.toJSON())
              }
            },
            onIceConnectionStateChange: (state) => {
              if (state === 'connected') {
                setConnectionState('connected')
                startStatsPolling()
              } else if (state === 'failed' || state === 'disconnected') {
                setConnectionState('failed')
                stopStatsPolling()
              }
            },
            onConnectionStateChange: (state) => {
              if (state === 'connected') {
                setConnectionState('connected')
              } else if (state === 'failed') {
                setConnectionState('failed')
                setError('Connection failed')
              } else if (state === 'closed') {
                setConnectionState('closed')
              }
            },
            onTrack: (event) => {
              if (event.streams[0]) {
                setRemoteStream(event.streams[0])
              }
            },
            onError: (err) => {
              setError(err.message)
              onError?.(err.message)
            },
          })
        }

        // Create and send answer
        const answer = await peerManagerRef.current.createAnswer(data.offer)

        // Process any queued ICE candidates
        await processIceCandidateQueue()

        // Send answer via signaling
        sendWebRTCAnswer(sessionId, data.fromUserId, answer)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to handle offer'
        setError(message)
        onError?.(message)
        setConnectionState('failed')
      }
    },
    [sessionId, remoteUserId, onError, processIceCandidateQueue]
  )

  // Handle incoming WebRTC answer
  const handleAnswer = useCallback(
    async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      if (data.fromUserId !== remoteUserId) return

      const manager = peerManagerRef.current
      if (!manager) return

      try {
        await manager.setRemoteAnswer(data.answer)

        // Process any queued ICE candidates
        await processIceCandidateQueue()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to handle answer'
        setError(message)
        onError?.(message)
      }
    },
    [remoteUserId, onError, processIceCandidateQueue]
  )

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(
    async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      if (data.fromUserId !== remoteUserId) return

      const manager = peerManagerRef.current

      // Queue candidate if peer connection doesn't have remote description yet
      if (!manager || !manager.pc.remoteDescription) {
        iceCandidateQueueRef.current.push(data.candidate)
        return
      }

      try {
        await manager.addIceCandidate(data.candidate)
      } catch {
        // Ignore errors for invalid candidates
      }
    },
    [remoteUserId]
  )

  // Subscribe to WebRTC signaling events
  useEffect(() => {
    const cleanup = subscribeToWebRTCEvents({
      onOffer: handleOffer,
      onAnswer: handleAnswer,
      onIceCandidate: handleIceCandidate,
    })

    return cleanup
  }, [handleOffer, handleAnswer, handleIceCandidate])

  // Start connection stats polling
  const startStatsPolling = useCallback(() => {
    if (statsIntervalRef.current) return

    statsIntervalRef.current = setInterval(async () => {
      const manager = peerManagerRef.current
      if (!manager) return

      try {
        const stats = await getConnectionStats(manager.pc)
        const parsed = parseConnectionStats(stats)
        setConnectionStats({
          rtt: parsed.roundTripTime,
          packetsLost: parsed.packetsLost,
          frameRate: parsed.frameRate,
        })
      } catch {
        // Ignore stats errors
      }
    }, 2000)
  }, [])

  // Stop connection stats polling
  const stopStatsPolling = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // Close peer connection
    if (peerManagerRef.current) {
      peerManagerRef.current.close()
      peerManagerRef.current = null
    }

    // Clear ICE candidate queue
    iceCandidateQueueRef.current = []

    // Stop stats polling
    stopStatsPolling()

    // Reset state
    setRemoteStream(null)
    setLocalStream(null)
    setConnectionState('idle')
    setConnectionStats({ rtt: null, packetsLost: 0, frameRate: null })
  }, [stopStatsPolling])

  // Start screen sharing
  const handleStartSharing = useCallback(async () => {
    if (!isSupported || disabled) return

    try {
      setError(null)
      setConnectionState('connecting')

      // Get screen share stream
      const result = await startScreenShare(quality)
      localStreamRef.current = result.stream
      setLocalStream(result.stream)

      // Listen for track ending (user stops share from browser)
      result.track.addEventListener('ended', () => {
        handleStopSharing()
      })

      // Create peer connection
      peerManagerRef.current = createManagedPeerConnection({
        onIceCandidate: (candidate) => {
          if (remoteUserId) {
            sendIceCandidate(sessionId, remoteUserId, candidate.toJSON())
          }
        },
        onIceConnectionStateChange: (state) => {
          if (state === 'connected') {
            setConnectionState('connected')
            startStatsPolling()
          } else if (state === 'failed' || state === 'disconnected') {
            setConnectionState('failed')
            stopStatsPolling()
          }
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            setConnectionState('connected')
          } else if (state === 'failed') {
            setConnectionState('failed')
            setError('Connection failed')
          } else if (state === 'closed') {
            setConnectionState('closed')
          }
        },
        onTrack: (event) => {
          if (event.streams[0]) {
            setRemoteStream(event.streams[0])
          }
        },
        onError: (err) => {
          setError(err.message)
          onError?.(err.message)
        },
      })

      // Add tracks to peer connection
      result.stream.getTracks().forEach((track) => {
        peerManagerRef.current?.addTrack(track, result.stream)
      })

      // Create and send offer if we have a remote user
      if (remoteUserId) {
        const offer = await peerManagerRef.current.createOffer()
        sendWebRTCOffer(sessionId, remoteUserId, offer)
      }

      setIsSharing(true)
      onSharingChange?.(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start screen share'
      setError(message)
      onError?.(message)
      setConnectionState('idle')
      cleanup()
    }
  }, [
    isSupported,
    disabled,
    quality,
    sessionId,
    remoteUserId,
    onSharingChange,
    onError,
    startStatsPolling,
    stopStatsPolling,
    cleanup,
  ])

  // Stop screen sharing
  const handleStopSharing = useCallback(() => {
    cleanup()
    setIsSharing(false)
    onSharingChange?.(false)
  }, [cleanup, onSharingChange])

  // Get connection status text
  const getStatusText = (): string => {
    switch (connectionState) {
      case 'connecting':
        return 'Connecting...'
      case 'connected':
        return 'Connected'
      case 'failed':
        return 'Connection failed'
      case 'closed':
        return 'Disconnected'
      default:
        return isSharing ? 'Starting...' : 'Ready'
    }
  }

  // Get status color
  const getStatusColor = (): string => {
    switch (connectionState) {
      case 'connecting':
        return 'text-yellow-500'
      case 'connected':
        return 'text-green-500'
      case 'failed':
        return 'text-red-500'
      case 'closed':
        return 'text-secondary-500'
      default:
        return 'text-secondary-500'
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-secondary-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-secondary-50">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-secondary-500"
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
          <h2 className="font-semibold text-secondary-900">Screen Share</h2>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          {connectionState === 'connected' && (
            <ConnectionQuality
              rtt={connectionStats.rtt}
              packetsLost={connectionStats.packetsLost}
              frameRate={connectionStats.frameRate}
            />
          )}
          <span className={`flex items-center gap-1.5 text-xs ${getStatusColor()}`}>
            <span
              className={`h-2 w-2 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-green-500'
                  : connectionState === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : connectionState === 'failed'
                  ? 'bg-red-500'
                  : 'bg-secondary-400'
              }`}
            />
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Browser warnings */}
      {browserWarnings.length > 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          <p className="text-xs text-yellow-700">
            {browserWarnings[0]}
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-800"
              aria-label="Dismiss error"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Video area */}
      <div className="flex-1 p-4 bg-secondary-100">
        {/* Remote video */}
        <RemoteVideo
          stream={remoteStream}
          isLoading={connectionState === 'connecting' && !isSharing}
          label={
            remoteStream
              ? `${userRole === 'user' ? "Expert's" : "User's"} Screen`
              : undefined
          }
          className="w-full h-full min-h-[200px]"
        />

        {/* Local preview (small) when sharing */}
        {isSharing && localStream && (
          <div className="absolute bottom-8 right-8 w-48 rounded-lg overflow-hidden shadow-lg border-2 border-primary-500">
            <RemoteVideo
              stream={localStream}
              label="Your screen"
              showFullscreen={false}
              className="w-full aspect-video"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 border-t border-secondary-200 bg-white">
        {isSharing ? (
          <button
            onClick={handleStopSharing}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
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
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            Stop Sharing
          </button>
        ) : (
          <button
            onClick={handleStartSharing}
            disabled={disabled || !isSupported || !remoteUserId}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-secondary-300 disabled:cursor-not-allowed transition-colors"
          >
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
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Share Screen
          </button>
        )}

        {/* Help text */}
        {!isSharing && !remoteUserId && (
          <p className="text-sm text-secondary-500">
            Waiting for the other participant to join...
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Compact screen share button for use in toolbars
 */
interface ScreenShareButtonProps {
  isSharing: boolean
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function ScreenShareButton({
  isSharing,
  onClick,
  disabled = false,
  className = '',
}: ScreenShareButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center p-3 rounded-xl transition-colors ${
        isSharing
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
      } disabled:bg-secondary-100 disabled:text-secondary-400 disabled:cursor-not-allowed ${className}`}
      aria-label={isSharing ? 'Stop screen share' : 'Start screen share'}
      title={isSharing ? 'Stop sharing' : 'Share screen'}
    >
      {isSharing ? (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      ) : (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  )
}
