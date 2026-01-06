import { createServer } from 'http'
import { config } from 'dotenv'
import { initializeSocketHandlers } from './socket.js'

// Load environment variables
config()

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001
const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Create HTTP server
 */
const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }))
    return
  }

  // Default response for other requests
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Call an Expert - Socket.io Server')
})

/**
 * Track connected clients
 */
let connectedClients = 0

/**
 * Initialize Socket.io with handlers
 */
const io = initializeSocketHandlers(httpServer, {
  corsOrigin: CORS_ORIGIN,
  onConnection: () => {
    connectedClients++
  },
  onDisconnection: () => {
    connectedClients--
  },
})

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  process.stdout.write(`\n${signal} received. Shutting down gracefully...\n`)

  // Notify all connected clients
  io.emit('error', {
    code: 'SERVER_SHUTDOWN',
    message: 'Server is shutting down',
  })

  // Close Socket.io
  await new Promise<void>((resolve) => {
    io.close(() => {
      resolve()
    })
  })

  // Close HTTP server
  await new Promise<void>((resolve) => {
    httpServer.close(() => {
      resolve()
    })
  })

  process.exit(0)
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

/**
 * Start the server
 */
httpServer.listen(PORT, () => {
  process.stdout.write(`Socket.io server running on port ${PORT}\n`)
  process.stdout.write(`CORS origin: ${CORS_ORIGIN}\n`)
})

// Handle server errors
httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    process.stderr.write(`Port ${PORT} is already in use\n`)
  } else {
    process.stderr.write(`Server error: ${error.message}\n`)
  }
  process.exit(1)
})

export { io, httpServer }
