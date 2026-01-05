import { Server, Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'

/**
 * Types for socket events and payloads
 */
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

export interface SessionParticipant {
  socketId: string
  userId: string
  role: 'user' | 'expert'
  joinedAt: Date
}

export interface ServerToClientEvents {
  'user-joined': (data: { userId: string; role: string; socketId: string }) => void
  'user-left': (data: { userId: string; role: string }) => void
  'new-message': (data: ChatMessagePayload & { id: string }) => void
  'typing': (data: { userId: string; isTyping: boolean }) => void
  'session-ended': (data: { sessionId: string; endedBy: string; reason?: string }) => void
  'error': (data: { code: string; message: string }) => void
  'participants': (data: { participants: SessionParticipant[] }) => void
}

export interface ClientToServerEvents {
  'join-session': (data: JoinSessionPayload) => void
  'leave-session': (data: { sessionId: string }) => void
  'chat-message': (data: ChatMessagePayload) => void
  'typing': (data: TypingPayload) => void
  'end-session': (data: { sessionId: string; reason?: string }) => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  userId: string
  sessionId: string
  role: 'user' | 'expert'
}

/**
 * Track active sessions and their participants
 */
const sessionParticipants = new Map<string, Map<string, SessionParticipant>>()

/**
 * Get room name for a session
 */
function getSessionRoom(sessionId: string): string {
  return `session:${sessionId}`
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Initialize Socket.io handlers on the server
 */
export function initializeSocketHandlers(
  httpServer: HttpServer,
  options?: {
    corsOrigin?: string | string[]
    onConnection?: (socket: Socket) => void
    onDisconnection?: (socket: Socket) => void
  }
): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const corsOrigin = options?.corsOrigin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.on('connection', (socket) => {
    options?.onConnection?.(socket)

    /**
     * Handle joining a session room
     */
    socket.on('join-session', ({ sessionId, userId, role }) => {
      if (!sessionId || !userId || !role) {
        socket.emit('error', {
          code: 'INVALID_PAYLOAD',
          message: 'Missing required fields: sessionId, userId, or role',
        })
        return
      }

      const room = getSessionRoom(sessionId)

      // Store user data on socket for later use
      socket.data.userId = userId
      socket.data.sessionId = sessionId
      socket.data.role = role

      // Join the room
      socket.join(room)

      // Track participant
      if (!sessionParticipants.has(sessionId)) {
        sessionParticipants.set(sessionId, new Map())
      }

      const participants = sessionParticipants.get(sessionId)!
      participants.set(userId, {
        socketId: socket.id,
        userId,
        role,
        joinedAt: new Date(),
      })

      // Notify others in the room
      socket.to(room).emit('user-joined', {
        userId,
        role,
        socketId: socket.id,
      })

      // Send current participants to the newly joined user
      socket.emit('participants', {
        participants: Array.from(participants.values()),
      })
    })

    /**
     * Handle leaving a session room
     */
    socket.on('leave-session', ({ sessionId }) => {
      if (!sessionId) return

      const room = getSessionRoom(sessionId)
      const { userId, role } = socket.data

      // Leave the room
      socket.leave(room)

      // Remove from participants
      const participants = sessionParticipants.get(sessionId)
      if (participants && userId) {
        participants.delete(userId)
        if (participants.size === 0) {
          sessionParticipants.delete(sessionId)
        }
      }

      // Notify others
      if (userId && role) {
        socket.to(room).emit('user-left', { userId, role })
      }

      // Clear socket data
      socket.data.sessionId = ''
      socket.data.userId = ''
    })

    /**
     * Handle chat messages
     */
    socket.on('chat-message', ({ sessionId, message, senderId, senderName }) => {
      if (!sessionId || !message || !senderId) {
        socket.emit('error', {
          code: 'INVALID_PAYLOAD',
          message: 'Missing required fields: sessionId, message, or senderId',
        })
        return
      }

      const room = getSessionRoom(sessionId)

      // Emit message to all participants including sender
      io.to(room).emit('new-message', {
        id: generateMessageId(),
        sessionId,
        message,
        senderId,
        senderName,
        timestamp: new Date().toISOString(),
      })
    })

    /**
     * Handle typing indicators
     */
    socket.on('typing', ({ sessionId, userId, isTyping }) => {
      if (!sessionId || !userId) return

      const room = getSessionRoom(sessionId)

      // Broadcast to others (not the sender)
      socket.to(room).emit('typing', {
        userId,
        isTyping,
      })
    })

    /**
     * Handle session ending
     */
    socket.on('end-session', ({ sessionId, reason }) => {
      if (!sessionId) return

      const room = getSessionRoom(sessionId)
      const { userId } = socket.data

      // Notify all participants
      io.to(room).emit('session-ended', {
        sessionId,
        endedBy: userId || 'system',
        reason,
      })

      // Clean up participants tracking
      sessionParticipants.delete(sessionId)
    })

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      options?.onDisconnection?.(socket)

      const { sessionId, userId, role } = socket.data

      if (sessionId && userId) {
        const room = getSessionRoom(sessionId)

        // Remove from participants
        const participants = sessionParticipants.get(sessionId)
        if (participants) {
          participants.delete(userId)
          if (participants.size === 0) {
            sessionParticipants.delete(sessionId)
          }
        }

        // Notify others in the room
        socket.to(room).emit('user-left', { userId, role: role || 'user' })
      }
    })
  })

  return io
}

/**
 * Get current participants for a session (for external use)
 */
export function getSessionParticipants(sessionId: string): SessionParticipant[] {
  const participants = sessionParticipants.get(sessionId)
  return participants ? Array.from(participants.values()) : []
}

/**
 * Check if a user is in a session (for external use)
 */
export function isUserInSession(sessionId: string, userId: string): boolean {
  const participants = sessionParticipants.get(sessionId)
  return participants?.has(userId) ?? false
}
