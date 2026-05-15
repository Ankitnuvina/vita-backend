import type { CookieOptions, Response } from 'express'
import { config, isProd } from '../config'
import { cookieNames } from './jwt.service'

const FIFTEEN_MIN_MS = 40 * 60 * 1000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain: config.cookieDomain,
    path: '/',
  }
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(cookieNames.access, accessToken, {
    ...baseOptions(),
    maxAge: FIFTEEN_MIN_MS,
  })
  res.cookie(cookieNames.refresh, refreshToken, {
    ...baseOptions(),
    maxAge: THIRTY_DAYS_MS,
  })
}

export function clearAuthCookies(res: Response): void {
  const opts = baseOptions()
  res.clearCookie(cookieNames.access, opts)
  res.clearCookie(cookieNames.refresh, opts)
}
