import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config'
import { closeDb, connectDb } from './db/adapter'
import { logger } from './logger'
import { errorHandler } from './middleware/errorHandler'
import { adminRouter } from './routes/admin.routes'
import { authRouter } from './routes/auth.routes'
import { contentRouter } from './routes/content.routes'

import { blogRouter } from './routes/blog.routes'

import path from 'path'

const app = express()

app.set('trust proxy', 1)

// Helmet first, but relax Cross-Origin-Resource-Policy so that uploaded
// images / videos served from /uploads can be loaded by the SPA frontend
// (different origin/port) via <img>, <video>, fetch, canvas, etc.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)
app.use(express.json({ limit: '256kb' }))
app.use(cookieParser())
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (config.corsOrigin.includes(origin)) return callback(null, true)
      logger.warn('[cors] Blocked origin', { origin })
      callback(new Error('Origin not allowed'))
    },
    credentials: true,
  })
)

// Serve uploaded files. Explicit CORP header here as a safety net in case
// helmet is reconfigured later. maxAge gives basic browser caching.
app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    next()
  },
  express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: '7d',
    fallthrough: true,
  })
)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv })
})

app.use('/api', blogRouter) 

app.use('/api/auth', authRouter)
app.use('/api', contentRouter)
app.use('/api/admin', adminRouter)



app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path })
})

app.use(errorHandler)

async function bootstrap(): Promise<void> {
  await connectDb()
  const server = app.listen(config.port, () => {
    logger.info(`[server] Listening on http://localhost:${config.port} (${config.nodeEnv})`)
    logger.info(`[server] CORS origins: ${config.corsOrigin.join(', ')}`)
  })

  const shutdown = async (signal: string) => {
    logger.info(`[server] Received ${signal}, shutting down...`)
    server.close(async () => {
      await closeDb()
      process.exit(0)
    })
    setTimeout(async () => {
      logger.warn('[server] Graceful shutdown timed out, forcing exit.')
      await closeDb()
      process.exit(1)
    }, 10_000).unref()
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

bootstrap().catch(async (err) => {
  logger.error('[server] Failed to start:', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.stack) logger.error(err.stack)
  await closeDb()
  process.exit(1)
})
