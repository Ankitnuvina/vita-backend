import bcrypt from 'bcryptjs'
import type { RequestHandler } from 'express'
import { ZodError } from 'zod'
import { config } from '../config'
import { userRepo } from '../data/store'
import { logger } from '../logger'
import {
  loginSchema,
  registerAdminSchema,
  registerUserSchema,
} from '../schemas'
import { clearAuthCookies, setAuthCookies } from '../services/cookies.service'
import {
  cookieNames,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../services/jwt.service'
import type { AuthUser, UserRole } from '../types'

function publicUser(user: { userId: string; role: UserRole }): AuthUser {
  return { userId: user.userId, role: user.role }
}

function issueSession(
  res: Parameters<RequestHandler>[1],
  user: AuthUser
): void {
  const access = signAccessToken(user)
  const refresh = signRefreshToken(user)
  setAuthCookies(res, access, refresh)
}

function handleZod(err: unknown, res: Parameters<RequestHandler>[1]): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path, message: i.message })),
    })
    return true
  }
  return false
}

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body)
    const record = await userRepo.findByUsername(username)

    if (!record) {
      logger.warn('[AuthController] Login failed — unknown username')
      res.status(401).json({ error: 'Invalid username or password' })
      return
    }

    const ok = await bcrypt.compare(password, record.passwordHash)
    if (!ok) {
      logger.warn(`[AuthController] Login failed — bad password for userId: ${record.userId}`)
      res.status(401).json({ error: 'Invalid username or password' })
      return
    }

    const user = publicUser(record)
    issueSession(res, user)
    logger.info(`[AuthController] Login OK userId: ${user.userId} role: ${user.role}`)
    res.json(user)
  } catch (err) {
    if (handleZod(err, res)) return
    next(err)
  }
}

/**
 * Admin-only login endpoint. Same credential check as /login but rejects
 * any non-admin account so the /admin/login UI cannot be (mis)used by users.
 */
export const adminLogin: RequestHandler = async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body)
    const record = await userRepo.findByUsername(username)

    if (!record) {
      logger.warn('[AuthController] Admin login failed — unknown username')
      res.status(401).json({ error: 'Invalid username or password' })
      return
    }

    const ok = await bcrypt.compare(password, record.passwordHash)
    if (!ok) {
      logger.warn(`[AuthController] Admin login failed — bad password for userId: ${record.userId}`)
      res.status(401).json({ error: 'Invalid username or password' })
      return
    }

    if (record.role !== 'admin') {
      logger.warn(`[AuthController] Admin login refused — userId: ${record.userId} is not admin`)
      res.status(403).json({ error: 'This account does not have admin access' })
      return
    }

    const user = publicUser(record)
    issueSession(res, user)
    logger.info(`[AuthController] Admin login OK userId: ${user.userId}`)
    res.json(user)
  } catch (err) {
    if (handleZod(err, res)) return
    next(err)
  }
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    const { username, password } = registerUserSchema.parse(req.body)

    if (await userRepo.exists(username)) {
      logger.info(`[AuthController] Register conflict — username taken: ${username}`)
      res.status(409).json({ error: 'Username is already taken' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const record = await userRepo.create({ username, role: 'user', passwordHash })
    const user = publicUser(record)

    issueSession(res, user)
    logger.info(`[AuthController] Registered new user userId: ${user.userId}`)
    res.status(201).json(user)
  } catch (err) {
    if (handleZod(err, res)) return
    next(err)
  }
}  

/**
 * Admin self-registration. Gated by ADMIN_INVITE_CODE so the URL alone is
 * not enough to create an admin — the operator must share the code.
 */
export const registerAdmin: RequestHandler = async (req, res, next) => {
  try {
    const { username, password, inviteCode } = registerAdminSchema.parse(req.body)
    if (inviteCode !== config.adminInviteCode) {
      logger.warn('[AuthController] Admin register rejected — bad invite code')
      res.status(403).json({ error: 'Invalid admin invite code' })
      return
    }

    if (await userRepo.exists(username)) {
      logger.info(`[AuthController] Admin register conflict — username taken: ${username}`)
      res.status(409).json({ error: 'Username is already taken' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const record = await userRepo.create({ username, role: 'admin', passwordHash })
    const user = publicUser(record)

    issueSession(res, user)
    logger.info(`[AuthController] Registered new admin userId: ${user.userId}`)
    res.status(201).json(user)
  } catch (err) {
    if (handleZod(err, res)) return
    next(err)
  }
}

export const logout: RequestHandler = (_req, res) => {
  clearAuthCookies(res)
  res.json({ success: true })
}

export const me: RequestHandler = (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  res.json({ userId: req.user.userId, role: req.user.role })
}

export const refresh: RequestHandler = async (req, res, next) => {
  const token: unknown = req.cookies?.[cookieNames.refresh]
  if (typeof token !== 'string' || !token) {
    res.status(401).json({ error: 'Missing refresh token' })
    return
  }

  try {
    const payload = verifyRefreshToken(token)
    const record = await userRepo.findByUserId(payload.userId)
    if (!record) {
      logger.warn('[AuthController] Refresh failed — user no longer exists')
      clearAuthCookies(res)
      res.status(401).json({ error: 'Session is no longer valid' })
      return
    }

    const user = publicUser(record)
    issueSession(res, user)
    logger.info(`[AuthController] Refresh OK userId: ${user.userId}`)
    res.json(user)
  } catch (err) {
    if (err instanceof Error && /jwt|token|expired/i.test(err.message)) {
      logger.warn('[AuthController] Refresh failed — bad token', { message: err.message })
      clearAuthCookies(res)
      res.status(401).json({ error: 'Invalid or expired refresh token' })
      return
    }
    next(err)
  }
}
