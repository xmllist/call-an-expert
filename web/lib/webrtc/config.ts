/**
 * WebRTC Configuration
 *
 * ICE server configuration for NAT traversal.
 * Uses public STUN servers for development and supports TURN for production.
 */

// ============================================================================
// Types
// ============================================================================

export interface WebRTCConfig {
  iceServers: RTCIceServer[]
  iceCandidatePoolSize?: number
  bundlePolicy?: RTCBundlePolicy
  rtcpMuxPolicy?: RTCRtcpMuxPolicy
}

export interface TURNCredentials {
  urls: string | string[]
  username: string
  credential: string
}

// ============================================================================
// Default ICE Servers
// ============================================================================

/**
 * Public STUN servers for NAT traversal
 *
 * Google's public STUN servers are reliable for development.
 * Add more servers for redundancy in production.
 */
const PUBLIC_STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
]

// ============================================================================
// Configuration Factory
// ============================================================================

/**
 * Get the default WebRTC configuration
 *
 * Uses public STUN servers. Add TURN server for production
 * to handle symmetric NAT and firewalled networks.
 *
 * @returns RTCConfiguration object
 */
export function getDefaultConfig(): RTCConfiguration {
  const config: RTCConfiguration = {
    iceServers: [...PUBLIC_STUN_SERVERS],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  }

  // Add TURN server if configured (for production)
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL

  if (turnUrl && turnUsername && turnCredential) {
    config.iceServers?.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    })
  }

  return config
}

/**
 * Create a custom WebRTC configuration
 *
 * @param customConfig - Custom configuration to merge with defaults
 * @returns Merged RTCConfiguration
 */
export function createConfig(customConfig: Partial<RTCConfiguration> = {}): RTCConfiguration {
  const defaults = getDefaultConfig()

  return {
    ...defaults,
    ...customConfig,
    iceServers: customConfig.iceServers || defaults.iceServers,
  }
}

/**
 * Add TURN server credentials to configuration
 *
 * @param config - Base configuration
 * @param turn - TURN server credentials
 * @returns Configuration with TURN server added
 */
export function addTURNServer(
  config: RTCConfiguration,
  turn: TURNCredentials
): RTCConfiguration {
  return {
    ...config,
    iceServers: [
      ...(config.iceServers || []),
      {
        urls: turn.urls,
        username: turn.username,
        credential: turn.credential,
      },
    ],
  }
}

// ============================================================================
// Screen Share Constraints
// ============================================================================

/**
 * Default constraints for screen sharing via getDisplayMedia
 *
 * - cursor: 'always' shows cursor position
 * - audio: true captures system audio if available
 * - video: configured for high quality screen capture
 */
export const SCREEN_SHARE_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: {
    cursor: 'always',
    displaySurface: 'monitor',
  } as MediaTrackConstraints,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
  },
}

/**
 * High quality screen share constraints (1080p)
 */
export const SCREEN_SHARE_CONSTRAINTS_HD: DisplayMediaStreamOptions = {
  video: {
    cursor: 'always',
    displaySurface: 'monitor',
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
  } as MediaTrackConstraints,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
  },
}

/**
 * Low bandwidth screen share constraints (720p, 15fps)
 */
export const SCREEN_SHARE_CONSTRAINTS_LOW: DisplayMediaStreamOptions = {
  video: {
    cursor: 'always',
    displaySurface: 'monitor',
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 15, max: 15 },
  } as MediaTrackConstraints,
  audio: false,
}

// ============================================================================
// Browser Detection
// ============================================================================

/**
 * Check if WebRTC is supported in the current browser
 */
export function isWebRTCSupported(): boolean {
  if (typeof window === 'undefined') return false

  return !!(
    window.RTCPeerConnection &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getDisplayMedia
  )
}

/**
 * Check if the current browser is Safari
 *
 * Safari has limited WebRTC support - some features may not work.
 */
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false

  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')
}

/**
 * Get browser compatibility warnings for WebRTC
 *
 * @returns Array of warning messages, empty if fully supported
 */
export function getBrowserWarnings(): string[] {
  const warnings: string[] = []

  if (typeof window === 'undefined') {
    return ['WebRTC is not available in server-side rendering']
  }

  if (!window.RTCPeerConnection) {
    warnings.push('Your browser does not support WebRTC peer connections')
  }

  if (!navigator.mediaDevices?.getDisplayMedia) {
    warnings.push('Your browser does not support screen sharing')
  }

  if (isSafari()) {
    warnings.push('Safari has limited WebRTC support. For best experience, use Chrome or Firefox.')
  }

  // Check if running in insecure context (WebRTC requires HTTPS in production)
  if (
    window.location.protocol !== 'https:' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    warnings.push('WebRTC requires HTTPS in production. Some features may not work.')
  }

  return warnings
}
