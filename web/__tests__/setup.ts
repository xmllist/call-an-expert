/**
 * Vitest Unit Test Setup
 *
 * Configures the test environment for unit tests.
 */

import '@testing-library/react'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock'
process.env.NEXT_PUBLIC_SOCKET_URL = 'http://localhost:3001'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = () => {}
  disconnect = () => {}
  unobserve = () => {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// Mock ResizeObserver
class MockResizeObserver {
  observe = () => {}
  disconnect = () => {}
  unobserve = () => {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getDisplayMedia: async () => ({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
    }),
    getUserMedia: async () => ({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
    }),
  },
})

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  createOffer = async () => ({})
  createAnswer = async () => ({})
  setLocalDescription = async () => {}
  setRemoteDescription = async () => {}
  addIceCandidate = async () => {}
  addTrack = () => {}
  close = () => {}
  ontrack = null
  onicecandidate = null
  onconnectionstatechange = null
  connectionState = 'new'
  iceConnectionState = 'new'
  getStats = async () => new Map()
}

Object.defineProperty(window, 'RTCPeerConnection', {
  writable: true,
  configurable: true,
  value: MockRTCPeerConnection,
})
