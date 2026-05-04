import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { logger } from '../logger'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    logger.warn('[errorHandler] Validation error', { issues: err.issues })
    res.status(400).json({ error: 'Validation failed', details: err.issues })
    return
  }

  if (err instanceof Error) {
    logger.error('[errorHandler] Unhandled error', { message: err.message, stack: err.stack })
    res.status(500).json({ error: 'Internal server error' })
    return
  }

  logger.error('[errorHandler] Unknown error', { err })
  res.status(500).json({ error: 'Internal server error' })
}
