import { readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { DbAdapter } from './adapter'
import { closeDb, getDb } from './adapter'
import { logger } from '../logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MIGRATIONS_DIR = resolve(__dirname, 'migrations')

export interface Migration {
  /** Apply the migration. Wrapped in a transaction by the runner. */
  up: (db: DbAdapter) => Promise<void> | void
  /** Revert the migration. Wrapped in a transaction by the runner. */
  down: (db: DbAdapter) => Promise<void> | void
}

interface MigrationRow {
  id: string
}

async function ensureMigrationsTable(db: DbAdapter): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          TEXT PRIMARY KEY,
      applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /\.(ts|js|mjs)$/.test(f))
    .sort()
}

function migrationId(filename: string): string {
  return filename.replace(/\.(ts|js|mjs)$/, '')
}

async function loadMigration(filename: string): Promise<Migration> {
  const fullPath = resolve(MIGRATIONS_DIR, filename)
  const mod: { default?: Migration; up?: Migration['up']; down?: Migration['down'] } = await import(
    pathToFileURL(fullPath).href
  )

  const migration = mod.default ?? (mod.up && mod.down ? { up: mod.up, down: mod.down } : null)
  if (!migration || typeof migration.up !== 'function' || typeof migration.down !== 'function') {
    throw new Error(`Migration ${filename} must export up() and down() functions (or a default { up, down }).`)
  }
  return migration
}

async function appliedSet(db: DbAdapter): Promise<Set<string>> {
  const rows = await db.query<MigrationRow>('SELECT id FROM _migrations ORDER BY id ASC')
  return new Set(rows.map((r) => r.id))
}

export async function up(): Promise<void> {
  const db = getDb()
  await ensureMigrationsTable(db)
  const applied = await appliedSet(db)
  const files = listMigrationFiles()
  const pending = files.filter((f) => !applied.has(migrationId(f)))

  if (pending.length === 0) {
    logger.info('[migrate] No pending migrations.')
    return
  }

  for (const file of pending) {
    const id = migrationId(file)
    const migration = await loadMigration(file)
    logger.info(`[migrate] Applying ${id}...`)
    await db.transaction(async (tx) => {
      await migration.up(tx)
      await tx.run('INSERT INTO _migrations (id) VALUES (?)', [id])
    })
    logger.info(`[migrate] Applied  ${id}`)
  }
  logger.info(`[migrate] Done. ${pending.length} migration(s) applied.`)
}

export async function down(): Promise<void> {
  const db = getDb()
  await ensureMigrationsTable(db)
  const last = await db.get<MigrationRow>(
    'SELECT id FROM _migrations ORDER BY id DESC LIMIT 1'
  )

  if (!last) {
    logger.info('[migrate] Nothing to roll back.')
    return
  }

  const file = listMigrationFiles().find((f) => migrationId(f) === last.id)
  if (!file) {
    throw new Error(`Migration file for "${last.id}" not found in ${MIGRATIONS_DIR}.`)
  }

  const migration = await loadMigration(file)
  logger.info(`[migrate] Rolling back ${last.id}...`)
  await db.transaction(async (tx) => {
    await migration.down(tx)
    await tx.run('DELETE FROM _migrations WHERE id = ?', [last.id])
  })
  logger.info(`[migrate] Rolled back ${last.id}`)
}

/** Roll back every applied migration in reverse order. Used by `db:reset`. */
export async function downAll(): Promise<void> {
  const db = getDb()
  await ensureMigrationsTable(db)
  const rows = await db.query<MigrationRow>('SELECT id FROM _migrations ORDER BY id DESC')

  if (rows.length === 0) {
    logger.info('[migrate] No applied migrations to roll back.')
    return
  }

  for (const { id } of rows) {
    const file = listMigrationFiles().find((f) => migrationId(f) === id)
    if (!file) {
      logger.warn(`[migrate] Skipping rollback for unknown migration "${id}" (file missing).`)
      continue
    }
    const migration = await loadMigration(file)
    logger.info(`[migrate] Rolling back ${id}...`)
    await db.transaction(async (tx) => {
      await migration.down(tx)
      await tx.run('DELETE FROM _migrations WHERE id = ?', [id])
    })
    logger.info(`[migrate] Rolled back ${id}`)
  }
}

export async function status(): Promise<void> {
  const db = getDb()
  await ensureMigrationsTable(db)
  const applied = await appliedSet(db)
  const files = listMigrationFiles()

  if (files.length === 0) {
    logger.info('[migrate] No migration files found.')
    return
  }

  const lines = files.map((f) => {
    const id = migrationId(f)
    const mark = applied.has(id) ? '[applied]' : '[pending]'
    return `  ${mark} ${id}`
  })
  logger.info(`[migrate] Migration status (${db.dialect}):\n${lines.join('\n')}`)
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'up'
  try {
    if (cmd === 'up') await up()
    else if (cmd === 'down') await down()
    else if (cmd === 'down:all') await downAll()
    else if (cmd === 'status') await status()
    else {
      logger.error(`[migrate] Unknown command: ${cmd}. Use one of: up | down | down:all | status.`)
      process.exit(1)
    }
  } finally {
    await closeDb()
  }
}

const isDirectInvocation =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(__filename).href

if (isDirectInvocation) {
  main().catch(async (err) => {
    logger.error('[migrate] Failed:', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) logger.error(err.stack)
    await closeDb()
    process.exit(1)
  })
}
