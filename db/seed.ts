import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { config } from '../config'
import {
  seedArticles,
  seedExperts,
  seedPlans,
  seedPodcasts,
  seedTips,
} from '../data/seed'
import { logger } from '../logger'
import type { DbAdapter } from './adapter'
import { closeDb, getDb } from './adapter'

/**
 * Boolean encoding helper. SQLite has no native BOOLEAN — we store 0/1 in
 * INTEGER columns. Postgres uses real BOOLEAN. The same JS `true`/`false`
 * value is converted to whichever the active driver expects.
 */
function bool(db: DbAdapter, value: boolean): boolean | number {
  return db.dialect === 'postgres' ? value : value ? 1 : 0
}

/**
 * Seeds the database with the initial content shown on the frontend.
 *
 * Idempotent: row counts are checked first; tables already populated are
 * skipped. To rebuild from scratch, run `npm run db:reset`.
 */
export async function seed(): Promise<void> {
  const db = getDb()
  await ensureMigrationsApplied(db)

  await db.transaction(async (tx) => {
    await seedUsers(tx)
    await seedArticlesTable(tx)
    await seedPodcastsTable(tx)
    await seedExpertsTable(tx)
    await seedTipsTable(tx)
    await seedPlansTable(tx)
    await seedAppMeta(tx)
  })

  logger.info('[seed] Done.')
}

async function ensureMigrationsApplied(db: DbAdapter): Promise<void> {
  const sql =
    db.dialect === 'postgres'
      ? "SELECT to_regclass('public._migrations') AS name"
      : "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"

  const row = await db.get<{ name: string | null }>(sql)
  if (!row?.name) {
    throw new Error(
      'Database has not been initialised. Run `npm run migrate` before `npm run seed`.'
    )
  }
}

async function tableCount(db: DbAdapter, table: string): Promise<number> {
  const row = await db.get<{ c: number | string }>(`SELECT COUNT(*) AS c FROM ${table}`)
  return Number(row?.c ?? 0)
}

async function seedUsers(db: DbAdapter): Promise<void> {
  const c = await tableCount(db, 'users')
  if (c > 0) {
    logger.info(`[seed] users: skipped (${c} row(s) already present)`)
    return
  }
  const sql = 'INSERT INTO users (user_id, username, role, password_hash) VALUES (?, ?, ?, ?)'
  await db.run(sql, ['admin-1', config.adminUsername, 'admin', config.adminPasswordHash])
  await db.run(sql, ['user-1', config.userUsername, 'user', config.userPasswordHash])
  logger.info('[seed] users: inserted default admin + reader')
}

async function seedArticlesTable(db: DbAdapter): Promise<void> {
  const c = await tableCount(db, 'articles')
  if (c > 0) {
    logger.info(`[seed] articles: skipped (${c} row(s))`)
    return
  }
  const sql = `
    INSERT INTO articles
      (id, cat, category_label, category_color, title, author, date, read_time, image_url, excerpt, is_premium, slug)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  for (const a of seedArticles) {
    await db.run(sql, [
      a.id,
      a.cat,
      a.categoryLabel,
      a.categoryColor,
      a.title,
      a.author,
      a.date,
      a.readTime,
      a.imageUrl,
      a.excerpt,
      bool(db, a.isPremium),
      a.slug,
    ])
  }
  if (db.dialect === 'postgres') {
    await db.exec(`SELECT setval(pg_get_serial_sequence('articles', 'id'), (SELECT MAX(id) FROM articles))`)
  }
  logger.info(`[seed] articles: inserted ${seedArticles.length}`)
}

async function seedPodcastsTable(db: DbAdapter): Promise<void> {
  const c = await tableCount(db, 'podcasts')
  if (c > 0) {
    logger.info(`[seed] podcasts: skipped (${c} row(s))`)
    return
  }
  const sql = `
    INSERT INTO podcasts (id, episode, category, title, guest, duration, date, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  for (const p of seedPodcasts) {
    await db.run(sql, [p.id, p.episode, p.category, p.title, p.guest, p.duration, p.date, p.imageUrl])
  }
  if (db.dialect === 'postgres') {
    await db.exec(`SELECT setval(pg_get_serial_sequence('podcasts', 'id'), (SELECT MAX(id) FROM podcasts))`)
  }
  logger.info(`[seed] podcasts: inserted ${seedPodcasts.length}`)
}

async function seedExpertsTable(db: DbAdapter): Promise<void> {
  const c = await tableCount(db, 'experts')
  if (c > 0) {
    logger.info(`[seed] experts: skipped (${c} row(s))`)
    return
  }
  const sql = `
    INSERT INTO experts (id, name, role, credentials, article_count, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  for (const e of seedExperts) {
    await db.run(sql, [e.id, e.name, e.role, e.credentials, e.articleCount, e.imageUrl])
  }
  if (db.dialect === 'postgres') {
    await db.exec(`SELECT setval(pg_get_serial_sequence('experts', 'id'), (SELECT MAX(id) FROM experts))`)
  }
  logger.info(`[seed] experts: inserted ${seedExperts.length}`)
}

async function seedTipsTable(db: DbAdapter): Promise<void> {
  const c = await tableCount(db, 'tips')
  if (c > 0) {
    logger.info(`[seed] tips: skipped (${c} row(s))`)
    return
  }
  const sql = `
    INSERT INTO tips (id, icon, color_bg, color_border, title, text)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  for (const t of seedTips) {
    await db.run(sql, [t.id, t.icon, t.colors.bg, t.colors.border, t.title, t.text])
  }
  if (db.dialect === 'postgres') {
    await db.exec(`SELECT setval(pg_get_serial_sequence('tips', 'id'), (SELECT MAX(id) FROM tips))`)
  }
  logger.info(`[seed] tips: inserted ${seedTips.length}`)
}

async function seedPlansTable(db: DbAdapter): Promise<void> {
  const c = await tableCount(db, 'plans')
  if (c > 0) {
    logger.info(`[seed] plans: skipped (${c} row(s))`)
    return
  }
  const sql = `
    INSERT INTO plans (id, name, monthly_price, annual_price, tagline, features, cta_label, is_popular, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  for (let idx = 0; idx < seedPlans.length; idx++) {
    const p = seedPlans[idx]
    await db.run(sql, [
      p.id,
      p.name,
      p.monthlyPrice,
      p.annualPrice,
      p.tagline,
      JSON.stringify(p.features),
      p.ctaLabel,
      bool(db, p.isPopular),
      idx,
    ])
  }
  logger.info(`[seed] plans: inserted ${seedPlans.length}`)
}

async function seedAppMeta(db: DbAdapter): Promise<void> {
  const sql =
    db.dialect === 'postgres'
      ? `INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING`
      : `INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)`
  await db.run(sql, ['subscriberCount', '52340'])
  logger.info('[seed] app_meta: subscriberCount ensured')
}

const __filename = fileURLToPath(import.meta.url)
const isDirectInvocation =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(__filename).href

if (isDirectInvocation) {
  seed()
    .catch(async (err) => {
      logger.error('[seed] Failed:', err instanceof Error ? err.message : err)
      if (err instanceof Error && err.stack) logger.error(err.stack)
      await closeDb()
      process.exit(1)
    })
    .finally(async () => {
      await closeDb()
    })
}
