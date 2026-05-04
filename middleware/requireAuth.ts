import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken, cookieNames } from '../services/jwt.service'
import { logger } from '../logger'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[cookieNames.access]
  if (typeof token !== 'string' || !token) {
    logger.warn('[requireAuth] Missing access cookie')
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  try {
    const payload = verifyAccessToken(token)
    req.user = { userId: payload.userId, role: payload.role }
    next()
  } catch (error) {
    logger.warn('[requireAuth] Invalid or expired token', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
