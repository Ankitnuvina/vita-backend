// import BetterSqlite3, { type Database as SqliteDatabase } from 'better-sqlite3'
// import { existsSync, mkdirSync } from 'node:fs'
// import { dirname, isAbsolute, resolve } from 'node:path'
// import { fileURLToPath } from 'node:url'
// import pg from 'pg'
// import { config } from '../config'
// import { logger } from '../logger'

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)
// const BACKEND_ROOT = resolve(__dirname, '..')

// export type Dialect = 'sqlite' | 'postgres'

// export interface RunResult {
//   /** Number of rows affected by the statement (driver-reported). */
//   changes: number
//   /**
//    * Last inserted row id when the table has an autoincrement integer PK.
//    * Null when not applicable. For Postgres prefer `RETURNING id` instead.
//    */
//   lastInsertId: number | bigint | null
// }

// /**
//  * Unified async DB API. The two implementations (SQLite + Postgres) share
//  * the same SQL surface: callers always use `?` placeholders, and the
//  * adapter rewrites them for Postgres ($1, $2, ...).
//  */
// export interface DbAdapter {
//   readonly dialect: Dialect
//   /** Run a parameterized query and return all rows. */
//   query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T[]>
//   /** Run a parameterized query and return the first row, or undefined. */
//   get<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T | undefined>
//   /** Run a non-SELECT statement; returns affected row count. */
//   run(sql: string, params?: readonly unknown[]): Promise<RunResult>
//   /** Execute a multi-statement DDL block (no params). Used by migrations. */
//   exec(sql: string): Promise<void>
//   /** Execute fn inside a transaction. Rolls back on throw. */
//   transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T>
//   /** Close the underlying connection / pool. */
//   close(): Promise<void>
// }

// export function resolveSqlitePath(rawPath: string): string {
//   return isAbsolute(rawPath) ? rawPath : resolve(BACKEND_ROOT, rawPath)
// }

// /* -------------------------------------------------------------------------- */
// /*  SQLite adapter (better-sqlite3, sync under the hood, async surface)       */
// /* -------------------------------------------------------------------------- */

// class SqliteAdapter implements DbAdapter {
//   readonly dialect: Dialect = 'sqlite'

//   constructor(private readonly db: SqliteDatabase) {}

//   async query<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
//     const stmt = this.db.prepare(sql)
//     return stmt.all(...(params as unknown[])) as T[]
//   }

//   async get<T>(sql: string, params: readonly unknown[] = []): Promise<T | undefined> {
//     const stmt = this.db.prepare(sql)
//     return stmt.get(...(params as unknown[])) as T | undefined
//   }

//   async run(sql: string, params: readonly unknown[] = []): Promise<RunResult> {
//     const stmt = this.db.prepare(sql)
//     const info = stmt.run(...(params as unknown[]))
//     return {
//       changes: info.changes,
//       lastInsertId: typeof info.lastInsertRowid === 'bigint'
//         ? Number(info.lastInsertRowid)
//         : info.lastInsertRowid,
//     }
//   }

//   async exec(sql: string): Promise<void> {
//     this.db.exec(sql)
//   }

//   async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
//     /**
//      * better-sqlite3's transaction() requires a sync callback; we don't get
//      * the perf benefit here, but we do get atomicity by manually issuing
//      * BEGIN / COMMIT / ROLLBACK around an async function. This works because
//      * the connection is single-threaded and not shared across requests.
//      */
//     this.db.exec('BEGIN')
//     try {
//       const result = await fn(this)
//       this.db.exec('COMMIT')
//       return result
//     } catch (err) {
//       this.db.exec('ROLLBACK')
//       throw err
//     }
//   }

//   async close(): Promise<void> {
//     this.db.close()
//   }
// }

// /* -------------------------------------------------------------------------- */
// /*  Postgres adapter (pg)                                                     */
// /* -------------------------------------------------------------------------- */

// /**
//  * Rewrites SQL written with `?` placeholders into Postgres's $1, $2, ...
//  * Quoted strings, double-quoted identifiers, and -- comments are skipped so
//  * an embedded `?` inside them is not converted.
//  */
// export function toPgPlaceholders(sql: string): string {
//   let out = ''
//   let i = 0
//   let n = 1
//   const len = sql.length

//   while (i < len) {
//     const ch = sql[i]

//     if (ch === "'" || ch === '"') {
//       const quote = ch
//       out += ch
//       i++
//       while (i < len) {
//         const c = sql[i]
//         out += c
//         i++
//         if (c === quote) {
//           if (sql[i] === quote) {
//             out += quote
//             i++
//             continue
//           }
//           break
//         }
//       }
//       continue
//     }

//     if (ch === '-' && sql[i + 1] === '-') {
//       while (i < len && sql[i] !== '\n') {
//         out += sql[i]
//         i++
//       }
//       continue
//     }

//     if (ch === '?') {
//       out += '$' + String(n++)
//       i++
//       continue
//     }

//     out += ch
//     i++
//   }
//   return out
// }

// class PostgresAdapter implements DbAdapter {
//   readonly dialect: Dialect = 'postgres'
//   private readonly pool: pg.Pool
//   private readonly txClient: pg.PoolClient | null

//   constructor(pool: pg.Pool, txClient: pg.PoolClient | null = null) {
//     this.pool = pool
//     this.txClient = txClient
//   }

//   private get runner(): pg.Pool | pg.PoolClient {
//     return this.txClient ?? this.pool
//   }

//   async query<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
//     const text = toPgPlaceholders(sql)
//     const result = await this.runner.query<Record<string, unknown>>(text, params as unknown[])
//     return result.rows as T[]
//   }

//   async get<T>(sql: string, params: readonly unknown[] = []): Promise<T | undefined> {
//     const rows = await this.query<T>(sql, params)
//     return rows[0]
//   }

//   async run(sql: string, params: readonly unknown[] = []): Promise<RunResult> {
//     const text = toPgPlaceholders(sql)
//     const result = await this.runner.query<Record<string, unknown>>(text, params as unknown[])
//     let lastInsertId: number | bigint | null = null
//     const firstRow = result.rows[0]
//     if (firstRow && typeof firstRow.id !== 'undefined') {
//       const v = firstRow.id
//       if (typeof v === 'number' || typeof v === 'bigint') lastInsertId = v
//       else if (typeof v === 'string' && /^\d+$/.test(v)) lastInsertId = Number(v)
//     }
//     return { changes: result.rowCount ?? 0, lastInsertId }
//   }

//   async exec(sql: string): Promise<void> {
//     await this.runner.query(sql)
//   }

//   async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
//     if (this.txClient) {
//       return fn(this)
//     }
//     const client = await this.pool.connect()
//     const inner = new PostgresAdapter(this.pool, client)
//     try {
//       await client.query('BEGIN')
//       const result = await fn(inner)
//       await client.query('COMMIT')
//       return result
//     } catch (err) {
//       try {
//         await client.query('ROLLBACK')
//       } catch {
//         /* ignore rollback failure */
//       }
//       throw err
//     } finally {
//       client.release()
//     }
//   }

//   async close(): Promise<void> {
//     await this.pool.end()
//   }
// }

// /* -------------------------------------------------------------------------- */
// /*  Factory                                                                   */
// /* -------------------------------------------------------------------------- */

// let cached: DbAdapter | null = null

// export function getDb(): DbAdapter {
//   if (cached) return cached

//   if (config.databaseClient === 'postgres') {
//     if (!config.databaseUrl) {
//       throw new Error(
//         'DATABASE_CLIENT=postgres requires DATABASE_URL to be set ' +
//           '(e.g. postgres://user:pass@localhost:5432/vitalize).'
//       )
//     }
//     const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 })
//     pool.on('error', (err) => logger.error('[db] Postgres pool error:', err.message))
//     cached = new PostgresAdapter(pool)
//     logger.debug(`[db] Connected to Postgres via DATABASE_URL`)
//     return cached
//   }

//   const fullPath = resolveSqlitePath(config.databasePath)
//   const dir = dirname(fullPath)
//   if (!existsSync(dir)) {
//     mkdirSync(dir, { recursive: true })
//     logger.info(`[db] Created data directory: ${dir}`)
//   }

//   const sqlite = new BetterSqlite3(fullPath)
//   sqlite.pragma('journal_mode = WAL')
//   sqlite.pragma('foreign_keys = ON')
//   cached = new SqliteAdapter(sqlite)
//   logger.debug(`[db] Connected to SQLite at ${fullPath}`)
//   return cached
// }

// export async function closeDb(): Promise<void> {
//   if (cached) {
//     await cached.close()
//     cached = null
//   }
// }







import BetterSqlite3, { type Database as SqliteDatabase } from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { config } from '../config'
import { logger } from '../logger'
 
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const BACKEND_ROOT = resolve(__dirname, '..')
 
export type Dialect = 'sqlite' | 'postgres'
 
export interface RunResult {
  /** Number of rows affected by the statement (driver-reported). */
  changes: number
  /**
   * Last inserted row id when the table has an autoincrement integer PK.
   * Null when not applicable. For Postgres prefer `RETURNING id` instead.
   */
  lastInsertId: number | bigint | null
}
 
/**
 * Unified async DB API. The two implementations (SQLite + Postgres) share
 * the same SQL surface: callers always use `?` placeholders, and the
 * adapter rewrites them for Postgres ($1, $2, ...).
 */
export interface DbAdapter {
  readonly dialect: Dialect
  /** Run a parameterized query and return all rows. */
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T[]>
  /** Run a parameterized query and return the first row, or undefined. */
  get<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T | undefined>
  /** Run a non-SELECT statement; returns affected row count. */
  run(sql: string, params?: readonly unknown[]): Promise<RunResult>
  /** Execute a multi-statement DDL block (no params). Used by migrations. */
  exec(sql: string): Promise<void>
  /** Execute fn inside a transaction. Rolls back on throw. */
  transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T>
  /** Close the underlying connection / pool. */
  close(): Promise<void>
}
 
export function resolveSqlitePath(rawPath: string): string {
  return isAbsolute(rawPath) ? rawPath : resolve(BACKEND_ROOT, rawPath)
}
 
/* -------------------------------------------------------------------------- */
/*  SQLite adapter (better-sqlite3, sync under the hood, async surface)       */
/* -------------------------------------------------------------------------- */
 
class SqliteAdapter implements DbAdapter {
  readonly dialect: Dialect = 'sqlite'
 
  constructor(private readonly db: SqliteDatabase) {}
 
  async query<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql)
    return stmt.all(...(params as unknown[])) as T[]
  }
 
  async get<T>(sql: string, params: readonly unknown[] = []): Promise<T | undefined> {
    const stmt = this.db.prepare(sql)
    return stmt.get(...(params as unknown[])) as T | undefined
  }
 
  async run(sql: string, params: readonly unknown[] = []): Promise<RunResult> {
    const stmt = this.db.prepare(sql)
    const info = stmt.run(...(params as unknown[]))
    return {
      changes: info.changes,
      lastInsertId: typeof info.lastInsertRowid === 'bigint'
        ? Number(info.lastInsertRowid)
        : info.lastInsertRowid,
    }
  }
 
  async exec(sql: string): Promise<void> {
    this.db.exec(sql)
  }
 
  async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
    /**
     * better-sqlite3's transaction() requires a sync callback; we don't get
     * the perf benefit here, but we do get atomicity by manually issuing
     * BEGIN / COMMIT / ROLLBACK around an async function. This works because
     * the connection is single-threaded and not shared across requests.
     */
    this.db.exec('BEGIN')
    try {
      const result = await fn(this)
      this.db.exec('COMMIT')
      return result
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    }
  }
 
  async close(): Promise<void> {
    this.db.close()
  }
}
 
/* -------------------------------------------------------------------------- */
/*  Postgres adapter (pg)                                                     */
/* -------------------------------------------------------------------------- */
 
/**
 * Rewrites SQL written with `?` placeholders into Postgres's $1, $2, ...
 * Quoted strings, double-quoted identifiers, and -- comments are skipped so
 * an embedded `?` inside them is not converted.
 */
export function toPgPlaceholders(sql: string): string {
  let out = ''
  let i = 0
  let n = 1
  const len = sql.length
 
  while (i < len) {
    const ch = sql[i]
 
    if (ch === "'" || ch === '"') {
      const quote = ch
      out += ch
      i++
      while (i < len) {
        const c = sql[i]
        out += c
        i++
        if (c === quote) {
          if (sql[i] === quote) {
            out += quote
            i++
            continue
          }
          break
        }
      }
      continue
    }
 
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < len && sql[i] !== '\n') {
        out += sql[i]
        i++
      }
      continue
    }
 
    if (ch === '?') {
      out += '$' + String(n++)
      i++
      continue
    }
 
    out += ch
    i++
  }
  return out
}
 
class PostgresAdapter implements DbAdapter {
  readonly dialect: Dialect = 'postgres'
  private readonly pool: pg.Pool
  private readonly txClient: pg.PoolClient | null
 
  constructor(pool: pg.Pool, txClient: pg.PoolClient | null = null) {
    this.pool = pool
    this.txClient = txClient
  }
 
  private get runner(): pg.Pool | pg.PoolClient {
    return this.txClient ?? this.pool
  }
 
  async query<T>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
    const text = toPgPlaceholders(sql)
    const result = await this.runner.query<Record<string, unknown>>(text, params as unknown[])
    return result.rows as T[]
  }
 
  async get<T>(sql: string, params: readonly unknown[] = []): Promise<T | undefined> {
    const rows = await this.query<T>(sql, params)
    return rows[0]
  }
 
  async run(sql: string, params: readonly unknown[] = []): Promise<RunResult> {
    const text = toPgPlaceholders(sql)
    const result = await this.runner.query<Record<string, unknown>>(text, params as unknown[])
    let lastInsertId: number | bigint | null = null
    const firstRow = result.rows[0]
    if (firstRow && typeof firstRow.id !== 'undefined') {
      const v = firstRow.id
      if (typeof v === 'number' || typeof v === 'bigint') lastInsertId = v
      else if (typeof v === 'string' && /^\d+$/.test(v)) lastInsertId = Number(v)
    }
    return { changes: result.rowCount ?? 0, lastInsertId }
  }
 
  async exec(sql: string): Promise<void> {
    await this.runner.query(sql)
  }
 
  async transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T> {
    if (this.txClient) {
      return fn(this)
    }
    const client = await this.pool.connect()
    const inner = new PostgresAdapter(this.pool, client)
    try {
      await client.query('BEGIN')
      const result = await fn(inner)
      await client.query('COMMIT')
      return result
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch {
        /* ignore rollback failure */
      }
      throw err
    } finally {
      client.release()
    }
  }
 
  async close(): Promise<void> {
    await this.pool.end()
  }
}
 
/* -------------------------------------------------------------------------- */
/*  Factory                                                                   */
/* -------------------------------------------------------------------------- */
 
let cached: DbAdapter | null = null
 
export function getDb(): DbAdapter {
  if (cached) return cached
 
  if (config.databaseClient === 'postgres') {
    const pg_ = config.postgres
    const hasSplitFields =
      pg_.host && pg_.user && pg_.password && pg_.database
 
    let poolConfig: pg.PoolConfig
    let source: string
 
    if (hasSplitFields) {
      poolConfig = {
        host: pg_.host,
        port: pg_.port,
        user: pg_.user,
        password: pg_.password,
        database: pg_.database,
        ssl: pg_.ssl ? { rejectUnauthorized: false } : false,
        max: 10,
      }
      source = `${pg_.user}@${pg_.host}:${pg_.port}/${pg_.database}`
    } else if (config.databaseUrl) {
      poolConfig = {
        connectionString: config.databaseUrl,
        ssl: pg_.ssl ? { rejectUnauthorized: false } : false,
        max: 10,
      }
      source = 'DATABASE_URL'
    } else {
      throw new Error(
        'DATABASE_CLIENT=postgres requires either POSTGRES_HOST/PORT/USER/PASSWORD/DATABASE ' +
          'or DATABASE_URL to be set.'
      )
    }
 
    const pool = new pg.Pool(poolConfig)
    pool.on('error', (err) => logger.error('[db] Postgres pool error:', err.message))
    cached = new PostgresAdapter(pool)
    logger.debug(`[db] Connected to Postgres (${source})`)
    return cached
  }
 
  const fullPath = resolveSqlitePath(config.databasePath)
  const dir = dirname(fullPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
    logger.info(`[db] Created data directory: ${dir}`)
  }
 
  const sqlite = new BetterSqlite3(fullPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  cached = new SqliteAdapter(sqlite)
  logger.debug(`[db] Connected to SQLite at ${fullPath}`)
  return cached
}
 
export async function closeDb(): Promise<void> {
  if (cached) {
    await cached.close()
    cached = null
  }
}