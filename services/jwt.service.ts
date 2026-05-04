import jwt, { type SignOptions } from 'jsonwebtoken'
import { config } from '../config'
import type { AuthUser, JwtPayload } from '../types'

const ACCESS_COOKIE_NAME = 'auth_token'
const REFRESH_COOKIE_NAME = 'auth_refresh_token'

export const cookieNames = {
  access: ACCESS_COOKIE_NAME,
  refresh: REFRESH_COOKIE_NAME,
} as const

export function signAccessToken(user: AuthUser): string {
  const options: SignOptions = { expiresIn: config.jwtExpiry as SignOptions['expiresIn'] }
  return jwt.sign({ userId: user.userId, role: user.role }, config.jwtSecret, options)
}

export function signRefreshToken(user: AuthUser): string {
  const options: SignOptions = { expiresIn: config.jwtRefreshExpiry as SignOptions['expiresIn'] }
  return jwt.sign({ userId: user.userId, role: user.role }, config.jwtRefreshSecret, options)
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as JwtPayload
}
