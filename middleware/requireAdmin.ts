import type { NextFunction, Request, Response } from 'express'
import { logger } from '../logger'

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    logger.error('[requireAdmin] Called without requireAuth — req.user missing')
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  if (req.user.role !== 'admin') {
    logger.warn('[requireAdmin] Forbidden — non-admin user', { userId: req.user.userId })
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  next()
}
