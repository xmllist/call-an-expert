'use client'

import { useEffect, useRef } from 'react'

/**
 * Message data structure for chat display.
 */
export interface Message {
  id: string
  sessionId: string
  message: string
  senderId: string
  senderName?: string
  timestamp?: string
}

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  typingUserId?: string | null
  typingUserName?: string
}

/**
 * Format a timestamp for display.
 */
function formatMessageTime(timestamp?: string): string {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Get initials from a name for avatar display.
 */
function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * MessageList component displays chat messages with auto-scroll.
 * Shows messages differently based on whether the current user sent them.
 */
export default function MessageList({
  messages,
  currentUserId,
  typingUserId,
  typingUserName,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUserId])

  if (messages.length === 0 && !typingUserId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-secondary-300"
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
          <p className="mt-4 text-sm text-secondary-500">
            No messages yet. Start the conversation!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => {
        const isCurrentUser = msg.senderId === currentUserId
        const displayName = msg.senderName || 'User'

        return (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${
              isCurrentUser ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            {!isCurrentUser && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-200 text-secondary-600 text-xs font-medium">
                {getInitials(displayName)}
              </div>
            )}

            {/* Message bubble */}
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                isCurrentUser
                  ? 'rounded-br-md bg-primary-600 text-white'
                  : 'rounded-bl-md bg-secondary-100 text-secondary-900'
              }`}
            >
              {/* Sender name for other users */}
              {!isCurrentUser && (
                <p className="text-xs font-medium text-secondary-600 mb-1">
                  {displayName}
                </p>
              )}

              {/* Message content */}
              <p className="text-sm whitespace-pre-wrap break-words">
                {msg.message}
              </p>

              {/* Timestamp */}
              {msg.timestamp && (
                <p
                  className={`text-xs mt-1 ${
                    isCurrentUser ? 'text-primary-200' : 'text-secondary-400'
                  }`}
                >
                  {formatMessageTime(msg.timestamp)}
                </p>
              )}
            </div>
          </div>
        )
      })}

      {/* Typing indicator */}
      {typingUserId && typingUserId !== currentUserId && (
        <div className="flex items-end gap-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-200 text-secondary-600 text-xs font-medium">
            {getInitials(typingUserName)}
          </div>
          <div className="rounded-2xl rounded-bl-md bg-secondary-100 px-4 py-2">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-secondary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 rounded-full bg-secondary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 rounded-full bg-secondary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}
