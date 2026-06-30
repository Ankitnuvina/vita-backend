import bcrypt from 'bcryptjs'
import type { RequestHandler } from 'express'
import { ZodError } from 'zod'
import { config } from '../config'
import { userRepo } from '../data/store'
import { logger } from '../logger'
import { registerAdminSchema, registerUserSchema, } from '../schemas'
import { clearAuthCookies, setAuthCookies } from '../services/cookies.service'
import { cookieNames, signAccessToken, signRefreshToken, verifyRefreshToken, } from '../services/jwt.service'
import type { AuthUser, UserRole } from '../types'

import crypto from 'crypto'
import { sendVerificationEmail } from '../services/email.service'

function publicUser(user: { userId: string; role: UserRole }): AuthUser {
  return { userId: user.userId, role: user.role }
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
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
    const { email, password } = req.body as { email: string; password: string }

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    const record = await userRepo.findByEmail(email)
    if (!record) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    const ok = await bcrypt.compare(password, record.passwordHash)
    if (!ok) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    if (!record.isVerified) {
      res.status(403).json({
        error: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      })
      return
    }

    if (record.isDeleted) {
      res.status(403).json({ error: 'This account has been deactivated.' })
      return
    }

    const user = publicUser(record)
    issueSession(res, user)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

/**
 * Admin-only login endpoint. Same credential check as /login but rejects
 * any non-admin account so the /admin/login UI cannot be (mis)used by users.
 */
export const adminLogin: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string }

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    const record = await userRepo.findByEmail(email)

    if (!record) {
      logger.warn('[AuthController] Admin login failed — unknown email')
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    const ok = await bcrypt.compare(password, record.passwordHash)
    if (!ok) {
      logger.warn(`[AuthController] Admin login failed — bad password for userId: ${record.userId}`)
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    if (record.role !== 'admin') {
      logger.warn(`[AuthController] Admin login refused — userId: ${record.userId} is not admin`)
      res.status(403).json({ error: 'This account does not have admin access' })
      return
    }

    if (!record.isVerified) {
      res.status(403).json({
        error: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      })
      return
    }

    if (record.isDeleted) {
      res.status(403).json({ error: 'This account has been deactivated.' })
      return
    }

    const user = publicUser(record)
    issueSession(res, user)
    logger.info(`[AuthController] Admin login OK userId: ${user.userId}`)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    const { username, email, password } = registerUserSchema.parse(req.body)

    if (await userRepo.exists(username)) {
      res.status(409).json({ error: 'Username is already taken' })
      return
    }
    if (await userRepo.existsByEmail(email)) {
      res.status(409).json({ error: 'Email is already registered' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const verificationToken = generateVerificationToken()
    const verificationTokenExpiry = new Date(
      Date.now() + config.verificationTokenExpiryHours * 60 * 60 * 1000
    )

    const record = await userRepo.create({
      username,
      email,
      role: 'user',
      passwordHash,
      verificationToken,
      verificationTokenExpiry,
    })

    // Verification email bhejo
    await sendVerificationEmail(email, username, verificationToken)

    logger.info(`[AuthController] Registered new user userId: ${record.userId}`)
    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
    })
  } catch (err) {
    if (handleZod(err, res)) return
    next(err)
  }
}

export const verifyEmail: RequestHandler = async (req, res, next) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : ''

    if (!token) {
      res.status(400).json({ error: 'Verification token is required' })
      return
    }
    const user = await userRepo.findByVerificationToken(token)
    if (!user) {
      res.status(200).json({
        message: 'Email already verified. Please login.',
        alreadyVerified: true
      })
      return
    }   

    if (user.isVerified) {
      res.status(400).json({ error: 'Email is already verified' })
      return
    }

    const expiry = user.verificationTokenExpiry
    if (!expiry || new Date(expiry) < new Date()) {  // new Date() wrapping zaroori hai
      res.status(400).json({ error: 'Verification token has expired.' })
      return
    }

    if (!expiry || new Date(expiry) < new Date()) {
      res.status(400).json({ error: 'Verification token has expired.' })
      return
    }

    await userRepo.verifyUser(user.userId)

    res.json({ message: 'Email verified successfully' })
  } catch (err) {
    next(err)
  }
}
// resendVerification — naya handler
export const resendVerification: RequestHandler = async (req, res, next) => {
  try {
    const { email } = req.body as { email?: string }
    if (!email) {
      res.status(400).json({ error: 'Email is required' })
      return
    }

    const user = await userRepo.findByEmail(email)
    if (!user) {
      // Security: exact error mat batao
      res.json({ message: 'If this email exists, a verification link has been sent.' })
      return
    }

    if (user.isVerified) {
      res.status(400).json({ error: 'This email is already verified.' })
      return
    }

    const token = generateVerificationToken()
    const expiry = new Date(Date.now() + config.verificationTokenExpiryHours * 60 * 60 * 1000)
    await userRepo.updateVerificationToken(user.userId, token, expiry)
    await sendVerificationEmail(user.email, user.username, token)

    res.json({ message: 'Verification email resent successfully.' })
  } catch (err) {
    next(err)
  }
}

/**
 * Admin self-registration. Gated by ADMIN_INVITE_CODE so the URL alone is
 * not enough to create an admin — the operator must share the code.
 */
export const registerAdmin: RequestHandler = async (req, res, next) => {
  try {
    const { username, email, password, inviteCode } = registerAdminSchema.parse(req.body)

    if (inviteCode !== config.adminInviteCode) {
      res.status(403).json({ error: 'Invalid admin invite code' })
      return
    }

    if (await userRepo.exists(username)) {
      res.status(409).json({ error: 'Username is already taken' })
      return
    }

    if (await userRepo.existsByEmail(email)) {
      res.status(409).json({ error: 'Email is already registered' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const verificationToken = generateVerificationToken()
    const verificationTokenExpiry = new Date(
      Date.now() + config.verificationTokenExpiryHours * 60 * 60 * 1000
    )

    const record = await userRepo.create({
      username,
      email,
      role: 'admin',
      passwordHash,
      verificationToken,
      verificationTokenExpiry,
    })

    await sendVerificationEmail(email, username, verificationToken)

    logger.info(`[AuthController] Registered new admin userId: ${record.userId}`)
    res.status(201).json({
      message: 'Admin registration successful. Please verify your email.',
    })
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
