'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import MessageList, { type Message } from './MessageList'
import {
  getSocket,
  connect,
  joinSession,
  leaveSession,
  sendMessage,
  sendTypingIndicator,
  subscribeToSessionEvents,
  type ChatMessage,
  type TypedSocket,
} from '@/lib/socket/client'

/**
 * Socket events used by this component:
 * - 'new-message': Received when a chat message is sent to the session
 * - 'typing': Received when another user starts/stops typing
 * - 'user-joined': Received when a participant joins the session
 * - 'user-left': Received when a participant leaves the session
 * - 'session-ended': Received when the session is terminated
 * - 'error': Received when a socket error occurs
 */

interface ChatProps {
  sessionId: string
  currentUserId: string
  currentUserName: string
  userRole: 'user' | 'expert'
  /** Initial messages loaded from database */
  initialMessages?: Message[]
  /** Callback when session ends */
  onSessionEnded?: (data: { endedBy: string; reason?: string }) => void
  /** Callback when other user joins */
  onUserJoined?: (data: { userId: string; role: string }) => void
  /** Callback when other user leaves */
  onUserLeft?: (data: { userId: string; role: string }) => void
  /** Callback when socket error occurs */
  onError?: (data: { code: string; message: string }) => void
}

/**
 * Chat component with real-time messaging via Socket.io.
 * Handles connection, message sending/receiving, and typing indicators.
 */
export default function Chat({
  sessionId,
  currentUserId,
  currentUserName,
  userRole,
  initialMessages = [],
  onSessionEnded,
  onUserJoined,
  onUserLeft,
  onError,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isConnecting, setIsConnecting] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [typingUserId, setTypingUserId] = useState<string | null>(null)
  const [typingUserName, setTypingUserName] = useState<string | undefined>()

  // Typing debounce timer
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  // Handle receiving new messages
  const handleNewMessage = useCallback((data: ChatMessage) => {
    setMessages((prev) => {
      // Check for duplicate messages
      if (prev.some((m) => m.id === data.id)) {
        return prev
      }
      return [...prev, data]
    })
  }, [])

  // Handle typing indicators
  const handleTyping = useCallback(
    (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== currentUserId) {
        if (data.isTyping) {
          setTypingUserId(data.userId)
        } else {
          setTypingUserId(null)
        }
      }
    },
    [currentUserId]
  )

  // Handle user joined
  const handleUserJoined = useCallback(
    (data: { userId: string; role: string; socketId: string }) => {
      onUserJoined?.(data)
    },
    [onUserJoined]
  )

  // Handle user left
  const handleUserLeft = useCallback(
    (data: { userId: string; role: string }) => {
      if (data.userId === typingUserId) {
        setTypingUserId(null)
      }
      onUserLeft?.(data)
    },
    [onUserLeft, typingUserId]
  )

  // Handle session ended
  const handleSessionEnded = useCallback(
    (data: { sessionId: string; endedBy: string; reason?: string }) => {
      onSessionEnded?.(data)
    },
    [onSessionEnded]
  )

  // Handle socket errors
  const handleError = useCallback(
    (data: { code: string; message: string }) => {
      setConnectionError(data.message)
      onError?.(data)
    },
    [onError]
  )

  // Connect to socket and join session
  useEffect(() => {
    let cleanupEvents: (() => void) | null = null
    let isMounted = true

    async function initializeConnection() {
      try {
        setIsConnecting(true)
        setConnectionError(null)

        // Connect to socket server
        await connect()

        if (!isMounted) return

        // Join the session room
        await joinSession(sessionId, currentUserId, userRole)

        if (!isMounted) return

        // Subscribe to session events
        cleanupEvents = subscribeToSessionEvents({
          onNewMessage: handleNewMessage,
          onTyping: handleTyping,
          onUserJoined: handleUserJoined,
          onUserLeft: handleUserLeft,
          onSessionEnded: handleSessionEnded,
          onError: handleError,
        })

        setIsConnected(true)
        setIsConnecting(false)
      } catch (error) {
        if (!isMounted) return
        setConnectionError(
          error instanceof Error ? error.message : 'Failed to connect'
        )
        setIsConnecting(false)
      }
    }

    initializeConnection()

    // Monitor socket connection status
    const socket = getSocket()
    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    // Cleanup on unmount
    return () => {
      isMounted = false
      cleanupEvents?.()
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      leaveSession(sessionId)
    }
  }, [
    sessionId,
    currentUserId,
    userRole,
    handleNewMessage,
    handleTyping,
    handleUserJoined,
    handleUserLeft,
    handleSessionEnded,
    handleError,
  ])

  // Send typing indicator with debounce
  const handleTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      sendTypingIndicator(sessionId, currentUserId, true)
    }

    // Reset the timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      sendTypingIndicator(sessionId, currentUserId, false)
    }, 2000)
  }, [sessionId, currentUserId])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    if (e.target.value.trim()) {
      handleTypingStart()
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedMessage = inputValue.trim()
    if (!trimmedMessage || !isConnected) return

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (isTypingRef.current) {
      isTypingRef.current = false
      sendTypingIndicator(sessionId, currentUserId, false)
    }

    // Send message via socket
    sendMessage(sessionId, trimmedMessage, currentUserId, currentUserName)

    // Clear input
    setInputValue('')
  }

  // Handle Enter key (submit on Enter, new line on Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Retry connection
  const handleRetry = () => {
    setConnectionError(null)
    setIsConnecting(true)
    connect()
      .then(() => joinSession(sessionId, currentUserId, userRole))
      .then(() => setIsConnected(true))
      .catch((error) =>
        setConnectionError(
          error instanceof Error ? error.message : 'Failed to connect'
        )
      )
      .finally(() => setIsConnecting(false))
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-secondary-200 overflow-hidden">
      {/* Chat header */}
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h2 className="font-semibold text-secondary-900">Chat</h2>
        </div>

        {/* Connection status indicator */}
        <div className="flex items-center gap-2">
          {isConnecting ? (
            <span className="flex items-center gap-1.5 text-xs text-secondary-500">
              <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              Connecting...
            </span>
          ) : isConnected ? (
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-red-500">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Connection error */}
      {connectionError && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{connectionError}</p>
            <button
              onClick={handleRetry}
              className="text-sm font-medium text-red-700 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        typingUserId={typingUserId}
        typingUserName={typingUserName}
      />

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 p-4 border-t border-secondary-200 bg-white"
      >
        <div className="flex-1 relative">
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={!isConnected}
            rows={1}
            className="w-full resize-none rounded-xl border border-secondary-300 px-4 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-secondary-50 disabled:cursor-not-allowed max-h-32"
            style={{
              minHeight: '42px',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!inputValue.trim() || !isConnected}
          className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-secondary-300 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </form>
    </div>
  )
}
