// import 'dotenv/config'

// function required(name: string): string {
//   const value = process.env[name]
//   if (!value || value.trim().length === 0) {
//     throw new Error(`Missing required env var: ${name}`)
//   }
//   return value
// }

// function optional(name: string, fallback: string): string {
//   const value = process.env[name]
//   return value && value.trim().length > 0 ? value : fallback
// }

// const nodeEnv = optional('NODE_ENV', 'development')

// export const isProd = nodeEnv === 'production'

// export const config = {
//   port: Number(optional('PORT', '3005')),
//   nodeEnv,
//   corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173')
//     .split(',')
//     .map((s) => s.trim())
//     .filter(Boolean),
//   cookieDomain: optional('COOKIE_DOMAIN', 'localhost'),
//   jwtSecret: required('JWT_SECRET'),
//   jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
//   jwtExpiry: optional('JWT_EXPIRY', '15m'),
//   jwtRefreshExpiry: optional('JWT_REFRESH_EXPIRY', '30d'),
//   adminUsername: required('ADMIN_USERNAME'),
//   adminPasswordHash: required('ADMIN_PASSWORD_HASH'),
//   userUsername: required('USER_USERNAME'),
//   userPasswordHash: required('USER_PASSWORD_HASH'),

//   adminInviteCode: required('ADMIN_INVITE_CODE'),
  
//   databaseClient: (optional('DATABASE_CLIENT', 'sqlite').toLowerCase() === 'postgres'
//     ? 'postgres'
//     : 'sqlite') as 'sqlite' | 'postgres',

//   databasePath: optional('DATABASE_PATH', 'db/vitalize.sqlite'),

//   databaseUrl: optional('DATABASE_URL', ''),
// } as const



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
 
export const config = {
  port: Number(optional('PORT', '3005')),
  nodeEnv,
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
  /**
   * Secret known only to operators.
   * Required to register a new admin via POST /api/auth/admin/register.
   */
  adminInviteCode: required('ADMIN_INVITE_CODE'),
  /**
   * Database driver. `sqlite` (default) is zero-config and uses a local
   * file at DATABASE_PATH. `postgres` uses DATABASE_URL.
   */
  databaseClient: (optional('DATABASE_CLIENT', 'sqlite').toLowerCase() === 'postgres'
    ? 'postgres'
    : 'sqlite') as 'sqlite' | 'postgres',
  /**
   * Path to the SQLite database file (relative to backend/ or absolute).
   * The directory will be created automatically if it doesn't exist.
   * Ignored when DATABASE_CLIENT=postgres.
   */
  databasePath: optional('DATABASE_PATH', 'db/vitalize.sqlite'),
  /**
   * Postgres connection string, e.g.
   *   postgres://vitalize:vitalize_dev@localhost:5432/vitalize
   * Optional when the split POSTGRES_* fields below are provided;
   * used as a fallback otherwise.
   */
  databaseUrl: optional('DATABASE_URL', ''),
  /**
   * Split Postgres connection fields. Preferred over DATABASE_URL when
   * all five are set. Used only when DATABASE_CLIENT=postgres.
   */
  postgres: {
    host: optional('POSTGRES_HOST', ''),
    port: Number(optional('POSTGRES_PORT', '5432')),
    user: optional('POSTGRES_USER', ''),
    password: optional('POSTGRES_PASSWORD', ''),
    database: optional('POSTGRES_DATABASE', ''),
    /** Enable SSL automatically in production. */
    ssl: nodeEnv === 'production',
  },
} as const