import { MongoClient, type Db } from 'mongodb'
import { config } from '../config'
import { logger } from '../logger'

/* -------------------------------------------------------------------------- */
/*  MongoDB client lifecycle                                                  */
/* -------------------------------------------------------------------------- */

let client: MongoClient | null = null
let cachedDb: Db | null = null

/**
 * Establishes the singleton MongoDB connection. Idempotent — safe to call
 * multiple times. Must be awaited before any repo operation runs.
 *
 * `server.ts` calls this on startup; CLI scripts (`migrate`, `seed`,
 * `reset`) call it before they touch the DB.
 */
export async function connectDb(): Promise<Db> {
  if (cachedDb) return cachedDb
  client = new MongoClient(config.mongoUri, {
    // Reasonable defaults for a small-to-medium service. Tune as needed.
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10_000,
  })
  await client.connect()
  cachedDb = client.db(config.mongoDb)
  logger.debug(`[db] Connected to MongoDB (db=${config.mongoDb})`)
  return cachedDb
}

/**
 * Returns the connected `Db` handle. Throws if `connectDb()` has not yet
 * resolved — this is intentional: every code path that touches data already
 * goes through `server.ts` (which awaits `connectDb`) or a CLI script.
 */
export function getDb(): Db {
  if (!cachedDb) {
    throw new Error(
      'MongoDB has not been connected yet. Call `await connectDb()` before any repo operation.'
    )
  }
  return cachedDb
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    cachedDb = null
  }
}

/* -------------------------------------------------------------------------- */
/*  Collection name registry                                                  */
/* -------------------------------------------------------------------------- */

export const Collections = {
  users: 'users',
  articles: 'articles',
  podcasts: 'podcasts',
  experts: 'experts',
  tips: 'tips',
  plans: 'plans',
  appMeta: 'app_meta',
  counters: 'counters',
} as const

export type CounterName = 'articles' | 'podcasts' | 'experts' | 'tips'

interface CounterDoc {
  _id: CounterName
  seq: number
}

/**
 * Atomic auto-increment via the classic `counters` collection pattern.
 * Replaces SQL `SERIAL` / `INTEGER PRIMARY KEY AUTOINCREMENT` so the API
 * keeps returning the same kind of monotonically-increasing integer ids.
 *
 * Concurrency-safe: `findOneAndUpdate` with `$inc` is atomic in MongoDB.
 */
export async function nextId(name: CounterName): Promise<number> {
  const counters = getDb().collection<CounterDoc>(Collections.counters)
  const doc = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  )
  if (!doc || typeof doc.seq !== 'number') {
    throw new Error(`Failed to allocate next id for "${name}"`)
  }
  return doc.seq
}

/**
 * Bumps the counter so that the next allocation is at least `value + 1`.
 * Used by the seed script after inserting fixed-id documents.
 */
export async function setMinCounter(name: CounterName, value: number): Promise<void> {
  const counters = getDb().collection<CounterDoc>(Collections.counters)
  await counters.updateOne(
    { _id: name, seq: { $lt: value } },
    { $set: { seq: value } },
    { upsert: true }
  )
}
