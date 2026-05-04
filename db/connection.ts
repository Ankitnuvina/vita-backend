/**
 * Backwards-compat shim. The unified DB adapter lives in `./adapter.ts`;
 * this file re-exports it so existing `import { getDb } from './connection'`
 * call-sites keep working.
 */
export {
  closeDb,
  getDb,
  resolveSqlitePath as resolveDatabasePath,
  type DbAdapter,
  type Dialect,
  type RunResult,
} from './adapter'
