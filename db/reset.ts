import { existsSync, rmSync } from 'node:fs'
import { config } from '../config'
import { logger } from '../logger'
import { closeDb, getDb, resolveSqlitePath } from './adapter'
import { downAll, up as runMigrations } from './migrate'
import { seed } from './seed'

/**
 * Destructive convenience helper used by `npm run db:reset`.
 *
 * Rolls back every applied migration in reverse, drops the migrations
 * tracking table, then re-migrates and re-seeds. Works the same on both
 * drivers and avoids file-lock issues that can happen when the SQLite
 * file is open in another process (e.g. an IDE's DB viewer).
 *
 * If you specifically want to nuke the SQLite file, pass `--hard`:
 *
 *     npm run db:reset -- --hard
 */
async function reset(): Promise<void> {
  const hard = process.argv.includes('--hard')

  if (config.databaseClient === 'sqlite' && hard) {
    await closeDb()
    const fullPath = resolveSqlitePath(config.databasePath)
    for (const suffix of ['', '-wal', '-shm']) {
      const target = fullPath + suffix
      if (existsSync(target)) {
        try {
          rmSync(target, { force: true })
          logger.info(`[db:reset] Removed ${target}`)
        } catch (err) {
          logger.warn(
            `[db:reset] Could not remove ${target}: ${
              err instanceof Error ? err.message : 'unknown'
            }. Falling back to migration rollback.`
          )
        }
      }
    }
  } else {
    const db = getDb()
    await downAll()
    await db.exec('DROP TABLE IF EXISTS _migrations')
    logger.info(`[db:reset] ${db.dialect} schema dropped.`)
  }

  await runMigrations()
  await seed()
  await closeDb()
  logger.info('[db:reset] Database has been reset and reseeded.')
}

reset().catch(async (err) => {
  logger.error('[db:reset] Failed:', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.stack) logger.error(err.stack)
  await closeDb()
  process.exit(1)
})
