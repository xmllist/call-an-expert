/**
 * WebRTC Peer Connection Handler
 *
 * Manages WebRTC peer connections for screen sharing sessions.
 * Provides utilities for creating connections, handling offers/answers,
 * and managing ICE candidates.
 */

import {
  getDefaultConfig,
  createConfig,
  SCREEN_SHARE_CONSTRAINTS,
  SCREEN_SHARE_CONSTRAINTS_HD,
  SCREEN_SHARE_CONSTRAINTS_LOW,
  isWebRTCSupported,
  getBrowserWarnings,
} from './config'

// ============================================================================
// Types
// ============================================================================

export type ScreenShareQuality = 'auto' | 'high' | 'low'

export interface PeerConnectionState {
  connectionState: RTCPeerConnectionState
  iceConnectionState: RTCIceConnectionState
  iceGatheringState: RTCIceGatheringState
  signalingState: RTCSignalingState
}

export interface PeerConnectionCallbacks {
  onIceCandidate?: (candidate: RTCIceCandidate) => void
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  onTrack?: (event: RTCTrackEvent) => void
  onNegotiationNeeded?: () => void
  onDataChannel?: (channel: RTCDataChannel) => void
  onError?: (error: Error) => void
}

export interface ScreenShareResult {
  stream: MediaStream
  track: MediaStreamTrack
  stop: () => void
}

export interface PeerConnectionManager {
  pc: RTCPeerConnection
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  createOffer: () => Promise<RTCSessionDescriptionInit>
  createAnswer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>
  setRemoteAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>
  addTrack: (track: MediaStreamTrack, stream: MediaStream) => RTCRtpSender
  close: () => void
  getState: () => PeerConnectionState
}

// ============================================================================
// Screen Sharing
// ============================================================================

/**
 * Start screen sharing via getDisplayMedia
 *
 * Prompts the user to select a screen, window, or tab to share.
 * Returns the media stream and a cleanup function.
 *
 * @param quality - Screen share quality preset ('auto', 'high', 'low')
 * @returns Promise with screen share stream and controls
 * @throws Error if screen share is denied or not supported
 */
export async function startScreenShare(
  quality: ScreenShareQuality = 'auto'
): Promise<ScreenShareResult> {
  // Check browser support
  if (!isWebRTCSupported()) {
    const warnings = getBrowserWarnings()
    throw new Error(
      warnings.length > 0
        ? warnings.join('. ')
        : 'WebRTC is not supported in this browser'
    )
  }

  // Select constraints based on quality setting
  let constraints: DisplayMediaStreamOptions
  switch (quality) {
    case 'high':
      constraints = SCREEN_SHARE_CONSTRAINTS_HD
      break
    case 'low':
      constraints = SCREEN_SHARE_CONSTRAINTS_LOW
      break
    default:
      constraints = SCREEN_SHARE_CONSTRAINTS
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints)

    // Get the video track
    const videoTrack = stream.getVideoTracks()[0]

    if (!videoTrack) {
      throw new Error('No video track available from screen share')
    }

    // Create stop function that properly cleans up
    const stop = () => {
      stream.getTracks().forEach((track) => track.stop())
    }

    // Listen for user stopping share via browser UI
    videoTrack.addEventListener('ended', () => {
      stop()
    })

    return {
      stream,
      track: videoTrack,
      stop,
    }
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Screen share permission denied. Please allow screen sharing to continue.')
      }
      if (error.name === 'NotFoundError') {
        throw new Error('No screen sharing source found.')
      }
      if (error.name === 'NotReadableError') {
        throw new Error('Could not access screen for sharing. Another application may be using it.')
      }
      if (error.name === 'AbortError') {
        throw new Error('Screen sharing was cancelled.')
      }
    }

    throw error
  }
}

/**
 * Stop screen sharing
 *
 * Stops all tracks in the provided stream.
 *
 * @param stream - The MediaStream to stop
 */
export function stopScreenShare(stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    track.stop()
  })
}

// ============================================================================
// Peer Connection Factory
// ============================================================================

/**
 * Create a new RTCPeerConnection with the given configuration
 *
 * Uses default STUN servers for NAT traversal.
 * Add TURN server credentials in production for better connectivity.
 *
 * @param config - Optional custom RTCConfiguration
 * @returns Configured RTCPeerConnection instance
 */
export function createPeerConnection(
  config?: Partial<RTCConfiguration>
): RTCPeerConnection {
  const rtcConfig = config ? createConfig(config) : getDefaultConfig()
  return new RTCPeerConnection(rtcConfig)
}

/**
 * Create a managed peer connection with callbacks and utilities
 *
 * Provides a higher-level abstraction over RTCPeerConnection
 * with automatic event handling and cleanup.
 *
 * @param callbacks - Event callbacks for connection state changes
 * @param config - Optional custom RTCConfiguration
 * @returns PeerConnectionManager with utilities
 */
export function createManagedPeerConnection(
  callbacks: PeerConnectionCallbacks = {},
  config?: Partial<RTCConfiguration>
): PeerConnectionManager {
  const pc = createPeerConnection(config)
  let localStream: MediaStream | null = null
  let remoteStream: MediaStream | null = null

  // Set up event handlers
  pc.onicecandidate = (event) => {
    if (event.candidate && callbacks.onIceCandidate) {
      callbacks.onIceCandidate(event.candidate)
    }
  }

  pc.oniceconnectionstatechange = () => {
    callbacks.onIceConnectionStateChange?.(pc.iceConnectionState)

    // Handle connection failures
    if (pc.iceConnectionState === 'failed') {
      callbacks.onError?.(new Error('ICE connection failed'))
    }
  }

  pc.onconnectionstatechange = () => {
    callbacks.onConnectionStateChange?.(pc.connectionState)

    // Handle connection failures
    if (pc.connectionState === 'failed') {
      callbacks.onError?.(new Error('Peer connection failed'))
    }
  }

  pc.ontrack = (event) => {
    // Store remote stream
    if (event.streams[0]) {
      remoteStream = event.streams[0]
    }
    callbacks.onTrack?.(event)
  }

  pc.onnegotiationneeded = () => {
    callbacks.onNegotiationNeeded?.()
  }

  pc.ondatachannel = (event) => {
    callbacks.onDataChannel?.(event.channel)
  }

  return {
    pc,

    get localStream() {
      return localStream
    },

    get remoteStream() {
      return remoteStream
    },

    /**
     * Create an SDP offer for initiating a connection
     */
    async createOffer(): Promise<RTCSessionDescriptionInit> {
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      })
      await pc.setLocalDescription(offer)
      return offer
    },

    /**
     * Create an SDP answer in response to an offer
     */
    async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      return answer
    },

    /**
     * Set the remote answer after receiving it
     */
    async setRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
    },

    /**
     * Add an ICE candidate from the remote peer
     */
    async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    },

    /**
     * Add a local media track to the connection
     */
    addTrack(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender {
      localStream = stream
      return pc.addTrack(track, stream)
    },

    /**
     * Close the peer connection and cleanup
     */
    close(): void {
      // Stop local tracks
      localStream?.getTracks().forEach((track) => track.stop())

      // Close the connection
      pc.close()

      localStream = null
      remoteStream = null
    },

    /**
     * Get the current connection state
     */
    getState(): PeerConnectionState {
      return {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState,
      }
    },
  }
}

// ============================================================================
// Connection Utilities
// ============================================================================

/**
 * Wait for ICE gathering to complete
 *
 * Useful when you need to ensure all ICE candidates are gathered
 * before sending the offer/answer.
 *
 * @param pc - The RTCPeerConnection instance
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when gathering is complete
 */
export function waitForIceGatheringComplete(
  pc: RTCPeerConnection,
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pc.iceGatheringState === 'complete') {
      resolve()
      return
    }

    const timeoutId = setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onStateChange)
      reject(new Error('ICE gathering timed out'))
    }, timeout)

    const onStateChange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timeoutId)
        pc.removeEventListener('icegatheringstatechange', onStateChange)
        resolve()
      }
    }

    pc.addEventListener('icegatheringstatechange', onStateChange)
  })
}

/**
 * Wait for the connection to be established
 *
 * @param pc - The RTCPeerConnection instance
 * @param timeout - Maximum time to wait in milliseconds (default: 30000)
 * @returns Promise that resolves when connected
 */
export function waitForConnection(
  pc: RTCPeerConnection,
  timeout: number = 30000
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pc.connectionState === 'connected') {
      resolve()
      return
    }

    const timeoutId = setTimeout(() => {
      pc.removeEventListener('connectionstatechange', onStateChange)
      reject(new Error('Connection timed out'))
    }, timeout)

    const onStateChange = () => {
      if (pc.connectionState === 'connected') {
        clearTimeout(timeoutId)
        pc.removeEventListener('connectionstatechange', onStateChange)
        resolve()
      } else if (pc.connectionState === 'failed') {
        clearTimeout(timeoutId)
        pc.removeEventListener('connectionstatechange', onStateChange)
        reject(new Error('Connection failed'))
      }
    }

    pc.addEventListener('connectionstatechange', onStateChange)
  })
}

/**
 * Replace a track in an existing connection
 *
 * Useful for switching screen share sources without renegotiation.
 *
 * @param pc - The RTCPeerConnection instance
 * @param oldTrack - The track to replace
 * @param newTrack - The new track
 * @returns The RTCRtpSender if found, null otherwise
 */
export function replaceTrack(
  pc: RTCPeerConnection,
  oldTrack: MediaStreamTrack,
  newTrack: MediaStreamTrack
): RTCRtpSender | null {
  const sender = pc.getSenders().find((s) => s.track === oldTrack)
  if (sender) {
    sender.replaceTrack(newTrack)
    return sender
  }
  return null
}

/**
 * Get connection statistics
 *
 * @param pc - The RTCPeerConnection instance
 * @returns Promise with connection stats
 */
export async function getConnectionStats(
  pc: RTCPeerConnection
): Promise<RTCStatsReport> {
  return pc.getStats()
}

/**
 * Extract relevant metrics from connection stats
 *
 * @param stats - RTCStatsReport from getStats()
 * @returns Object with key metrics
 */
export function parseConnectionStats(stats: RTCStatsReport): {
  bytesReceived: number
  bytesSent: number
  packetsLost: number
  roundTripTime: number | null
  frameRate: number | null
} {
  let bytesReceived = 0
  let bytesSent = 0
  let packetsLost = 0
  let roundTripTime: number | null = null
  let frameRate: number | null = null

  stats.forEach((stat) => {
    if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
      bytesReceived = stat.bytesReceived || 0
      packetsLost = stat.packetsLost || 0
      frameRate = stat.framesPerSecond || null
    }
    if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
      bytesSent = stat.bytesSent || 0
    }
    if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
      roundTripTime = stat.currentRoundTripTime || null
    }
  })

  return { bytesReceived, bytesSent, packetsLost, roundTripTime, frameRate }
}

// ============================================================================
// Re-exports from config
// ============================================================================

export {
  getDefaultConfig,
  createConfig,
  isWebRTCSupported,
  getBrowserWarnings,
  isSafari,
} from './config'
