import type { Request } from 'express'

export type UserRole = 'admin' | 'user'

export interface JwtPayload {
  userId: string
  role: UserRole
  iat: number
  exp: number
}

export interface AuthUser {
  userId: string
  role: UserRole
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser
  }
}

export type AuthedRequest = Request & { user: AuthUser }
