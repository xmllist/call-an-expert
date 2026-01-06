import { io, Socket } from 'socket.io-client'

/**
 * Socket.io Client Singleton for Real-time Communication
 *
 * This module provides a singleton pattern for Socket.io connection
 * with typed events matching the server implementation.
 */

// ============================================================================
// Type Definitions (matching server/src/socket.ts)
// ============================================================================

export interface JoinSessionPayload {
  sessionId: string
  userId: string
  role: 'user' | 'expert'
}

export interface ChatMessagePayload {
  sessionId: string
  message: string
  senderId: string
  senderName?: string
  timestamp?: string
}

export interface TypingPayload {
  sessionId: string
  userId: string
  isTyping: boolean
}

export interface WebRTCOfferPayload {
  sessionId: string
  targetUserId: string
  offer: RTCSessionDescriptionInit
}

export interface WebRTCAnswerPayload {
  sessionId: string
  targetUserId: string
  answer: RTCSessionDescriptionInit
}

export interface WebRTCIceCandidatePayload {
  sessionId: string
  targetUserId: string
  candidate: RTCIceCandidateInit
}

export interface SessionParticipant {
  socketId: string
  userId: string
  role: 'user' | 'expert'
  joinedAt: string | Date
}

export interface ChatMessage extends ChatMessagePayload {
  id: string
}

export interface SocketError {
  code: string
  message: string
}

// Server-to-client event types
export interface ServerToClientEvents {
  'user-joined': (data: { userId: string; role: string; socketId: string }) => void
  'user-left': (data: { userId: string; role: string }) => void
  'new-message': (data: ChatMessage) => void
  'typing': (data: { userId: string; isTyping: boolean }) => void
  'session-ended': (data: { sessionId: string; endedBy: string; reason?: string }) => void
  'error': (data: SocketError) => void
  'participants': (data: { participants: SessionParticipant[] }) => void
  'webrtc-offer': (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => void
  'webrtc-answer': (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => void
  'webrtc-ice-candidate': (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => void
}

// Client-to-server event types
export interface ClientToServerEvents {
  'join-session': (data: JoinSessionPayload) => void
  'leave-session': (data: { sessionId: string }) => void
  'chat-message': (data: ChatMessagePayload) => void
  'typing': (data: TypingPayload) => void
  'end-session': (data: { sessionId: string; reason?: string }) => void
  'webrtc-offer': (data: WebRTCOfferPayload) => void
  'webrtc-answer': (data: WebRTCAnswerPayload) => void
  'webrtc-ice-candidate': (data: WebRTCIceCandidatePayload) => void
}

// Typed socket type
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// ============================================================================
// Socket Singleton
// ============================================================================

let socket: TypedSocket | null = null

/**
 * Get or create the Socket.io client singleton
 *
 * Uses lazy initialization and manual connection management.
 * Connection is NOT automatic - use connect() when ready.
 *
 * @returns The Socket.io client instance
 */
export function getSocket(): TypedSocket {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'

    socket = io(socketUrl, {
      // Manual connection management - don't connect on creation
      autoConnect: false,
      // Prefer WebSocket with polling fallback for reliability
      transports: ['websocket', 'polling'],
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Timeout settings
      timeout: 20000,
      // Don't send cookies (we handle auth separately)
      withCredentials: false,
    }) as TypedSocket
  }

  return socket
}

/**
 * Connect to the Socket.io server
 *
 * @returns Promise that resolves when connected
 */
export function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = getSocket()

    if (s.connected) {
      resolve()
      return
    }

    const onConnect = () => {
      s.off('connect', onConnect)
      s.off('connect_error', onError)
      resolve()
    }

    const onError = (error: Error) => {
      s.off('connect', onConnect)
      s.off('connect_error', onError)
      reject(error)
    }

    s.on('connect', onConnect)
    s.on('connect_error', onError)
    s.connect()
  })
}

/**
 * Disconnect from the Socket.io server
 */
export function disconnect(): void {
  if (socket) {
    socket.disconnect()
  }
}

/**
 * Check if the socket is connected
 */
export function isConnected(): boolean {
  return socket?.connected ?? false
}

// ============================================================================
// Session Helper Functions
// ============================================================================

/**
 * Join a session room for real-time communication
 *
 * @param sessionId - The session ID to join
 * @param userId - The current user's ID
 * @param role - The user's role in the session
 */
export async function joinSession(
  sessionId: string,
  userId: string,
  role: 'user' | 'expert'
): Promise<void> {
  const s = getSocket()

  // Connect if not already connected
  if (!s.connected) {
    await connect()
  }

  s.emit('join-session', { sessionId, userId, role })
}

/**
 * Leave a session room
 *
 * @param sessionId - The session ID to leave
 */
export function leaveSession(sessionId: string): void {
  const s = getSocket()

  if (s.connected) {
    s.emit('leave-session', { sessionId })
  }
}

/**
 * Send a chat message to the session
 *
 * @param sessionId - The session ID
 * @param message - The message content
 * @param senderId - The sender's user ID
 * @param senderName - Optional sender display name
 */
export function sendMessage(
  sessionId: string,
  message: string,
  senderId: string,
  senderName?: string
): void {
  const s = getSocket()

  if (s.connected) {
    s.emit('chat-message', {
      sessionId,
      message,
      senderId,
      senderName,
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Send typing indicator
 *
 * @param sessionId - The session ID
 * @param userId - The user's ID
 * @param isTyping - Whether the user is currently typing
 */
export function sendTypingIndicator(
  sessionId: string,
  userId: string,
  isTyping: boolean
): void {
  const s = getSocket()

  if (s.connected) {
    s.emit('typing', { sessionId, userId, isTyping })
  }
}

/**
 * End a session
 *
 * @param sessionId - The session ID to end
 * @param reason - Optional reason for ending
 */
export function endSession(sessionId: string, reason?: string): void {
  const s = getSocket()

  if (s.connected) {
    s.emit('end-session', { sessionId, reason })
  }
}

// ============================================================================
// WebRTC Signaling Helper Functions
// ============================================================================

/**
 * Send a WebRTC offer to another participant
 *
 * @param sessionId - The session ID
 * @param targetUserId - The target user's ID
 * @param offer - The RTC session description offer
 */
export function sendWebRTCOffer(
  sessionId: string,
  targetUserId: string,
  offer: RTCSessionDescriptionInit
): void {
  const s = getSocket()

  if (s.connected) {
    s.emit('webrtc-offer', { sessionId, targetUserId, offer })
  }
}

/**
 * Send a WebRTC answer to another participant
 *
 * @param sessionId - The session ID
 * @param targetUserId - The target user's ID
 * @param answer - The RTC session description answer
 */
export function sendWebRTCAnswer(
  sessionId: string,
  targetUserId: string,
  answer: RTCSessionDescriptionInit
): void {
  const s = getSocket()

  if (s.connected) {
    s.emit('webrtc-answer', { sessionId, targetUserId, answer })
  }
}

/**
 * Send an ICE candidate to another participant
 *
 * @param sessionId - The session ID
 * @param targetUserId - The target user's ID
 * @param candidate - The ICE candidate
 */
export function sendIceCandidate(
  sessionId: string,
  targetUserId: string,
  candidate: RTCIceCandidateInit
): void {
  const s = getSocket()

  if (s.connected) {
    s.emit('webrtc-ice-candidate', { sessionId, targetUserId, candidate })
  }
}

// ============================================================================
// Event Listener Helpers
// ============================================================================

/**
 * Subscribe to session events with cleanup
 *
 * @param handlers - Event handlers for session events
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToSessionEvents(handlers: {
  onUserJoined?: (data: { userId: string; role: string; socketId: string }) => void
  onUserLeft?: (data: { userId: string; role: string }) => void
  onNewMessage?: (data: ChatMessage) => void
  onTyping?: (data: { userId: string; isTyping: boolean }) => void
  onSessionEnded?: (data: { sessionId: string; endedBy: string; reason?: string }) => void
  onError?: (data: SocketError) => void
  onParticipants?: (data: { participants: SessionParticipant[] }) => void
}): () => void {
  const s = getSocket()

  if (handlers.onUserJoined) s.on('user-joined', handlers.onUserJoined)
  if (handlers.onUserLeft) s.on('user-left', handlers.onUserLeft)
  if (handlers.onNewMessage) s.on('new-message', handlers.onNewMessage)
  if (handlers.onTyping) s.on('typing', handlers.onTyping)
  if (handlers.onSessionEnded) s.on('session-ended', handlers.onSessionEnded)
  if (handlers.onError) s.on('error', handlers.onError)
  if (handlers.onParticipants) s.on('participants', handlers.onParticipants)

  // Return cleanup function
  return () => {
    if (handlers.onUserJoined) s.off('user-joined', handlers.onUserJoined)
    if (handlers.onUserLeft) s.off('user-left', handlers.onUserLeft)
    if (handlers.onNewMessage) s.off('new-message', handlers.onNewMessage)
    if (handlers.onTyping) s.off('typing', handlers.onTyping)
    if (handlers.onSessionEnded) s.off('session-ended', handlers.onSessionEnded)
    if (handlers.onError) s.off('error', handlers.onError)
    if (handlers.onParticipants) s.off('participants', handlers.onParticipants)
  }
}

/**
 * Subscribe to WebRTC signaling events with cleanup
 *
 * @param handlers - Event handlers for WebRTC events
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToWebRTCEvents(handlers: {
  onOffer?: (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => void
  onAnswer?: (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => void
  onIceCandidate?: (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => void
}): () => void {
  const s = getSocket()

  if (handlers.onOffer) s.on('webrtc-offer', handlers.onOffer)
  if (handlers.onAnswer) s.on('webrtc-answer', handlers.onAnswer)
  if (handlers.onIceCandidate) s.on('webrtc-ice-candidate', handlers.onIceCandidate)

  // Return cleanup function
  return () => {
    if (handlers.onOffer) s.off('webrtc-offer', handlers.onOffer)
    if (handlers.onAnswer) s.off('webrtc-answer', handlers.onAnswer)
    if (handlers.onIceCandidate) s.off('webrtc-ice-candidate', handlers.onIceCandidate)
  }
}
