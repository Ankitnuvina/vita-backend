import { MongoClient, type Db } from 'mongodb'
import { config } from '../config'
import { logger } from '../logger'

let client: MongoClient | null = null
let cachedDb: Db | null = null


export async function connectDb(): Promise<Db> {
  if (cachedDb) return cachedDb

  client = new MongoClient(config.mongoUri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10_000,
  })

  await client.connect()
  cachedDb = client.db(config.mongoDb)
  logger.debug(`[db] Connected to MongoDB (db=${config.mongoDb})`)

  await ensureIndexes(cachedDb)

  return cachedDb
}

async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection(Collections.comments).createIndexes([
      { key: { contentType: 1, contentId: 1, createdAt: -1 } },
      { key: { userId: 1 } },
    ]),

    db.collection(Collections.likes).createIndexes([
      { key: { contentType: 1, contentId: 1 } },
      { key: { userId: 1 } },
    ]),
  ])

  logger.debug('[db] Indexes ensured')
}

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


export const Collections = {
  users: 'users',
  articles: 'articles',
  podcasts: 'podcasts',
  experts: 'experts',
  tips: 'tips',
  plans: 'plans',
  appMeta: 'app_meta',
  mediaProgress: 'media_progress',
  counters: 'counters',
  blogs: 'blogs',
  likes: 'likes',
  comments: 'comments',
} as const

export type CounterName = 'articles' | 'podcasts' | 'experts' | 'tips' | 'blogs'

interface CounterDoc {
  _id: CounterName
  seq: number
}


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


export async function setMinCounter(name: CounterName, value: number): Promise<void> {
  const counters = getDb().collection<CounterDoc>(Collections.counters)
  await counters.updateOne(
    { _id: name, seq: { $lt: value } },
    { $set: { seq: value } },
    { upsert: true }
  )
}

