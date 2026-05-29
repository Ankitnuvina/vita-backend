import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function optional(name: string, fallback: string): string {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value : fallback
}

const nodeEnv = optional('NODE_ENV', 'development')

export const isProd = nodeEnv === 'production'

const port = Number(optional('PORT', '3005'))

export const config = {
  port,
  nodeEnv,
  appUrl: optional('APP_URL', `http://localhost:${port}`).replace(/\/+$/, ''),
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  cookieDomain: optional('COOKIE_DOMAIN', 'localhost'),
  jwtSecret: required('JWT_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtExpiry: optional('JWT_EXPIRY', '15m'),
  jwtRefreshExpiry: optional('JWT_REFRESH_EXPIRY', '30d'),
  adminUsername: required('ADMIN_USERNAME'),
  adminPasswordHash: required('ADMIN_PASSWORD_HASH'),
  userUsername: required('USER_USERNAME'),
  userPasswordHash: required('USER_PASSWORD_HASH'),
  adminInviteCode: required('ADMIN_INVITE_CODE'),
  mongoUri: optional('MONGO_URI', 'mongodb://localhost:27017'),
  mongoDb: optional('MONGO_DB', 'vitalize'),
} as const
