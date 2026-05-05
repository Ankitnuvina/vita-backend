import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { config } from './config'
import { logger } from './logger'
import { errorHandler } from './middleware/errorHandler'
import { adminRouter } from './routes/admin.routes'
import { authRouter } from './routes/auth.routes'
import { contentRouter } from './routes/content.routes'

const app = express()

app.use(helmet())
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv })
})

app.use('/api/auth', authRouter)
app.use('/api', contentRouter)
app.use('/api/admin', adminRouter)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path })
})

app.use(errorHandler)

// app.listen(config.port, () => {
//   logger.info(`[server] Listening on http://localhost:${config.port} (${config.nodeEnv})`)
//   logger.info(`[server] CORS origins: ${config.corsOrigin.join(', ')}`)
// })
app.listen(process.env.PORT || config.port, () => {
  logger.info(`[server] Listening on ${process.env.PORT}`)
})