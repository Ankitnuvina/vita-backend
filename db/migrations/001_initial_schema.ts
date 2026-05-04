import type { DbAdapter } from '../adapter'
import type { Migration } from '../migrate'

const migration: Migration = {
  async up(db: DbAdapter) {
    if (db.dialect === 'postgres') {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          user_id        TEXT PRIMARY KEY,
          username       TEXT NOT NULL UNIQUE,
          role           TEXT NOT NULL CHECK (role IN ('admin', 'user')),
          password_hash  TEXT NOT NULL,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uq
          ON users (LOWER(username));

        CREATE TABLE IF NOT EXISTS articles (
          id              SERIAL PRIMARY KEY,
          cat             TEXT NOT NULL,
          category_label  TEXT NOT NULL,
          category_color  TEXT NOT NULL,
          title           TEXT NOT NULL,
          author          TEXT NOT NULL,
          date            TEXT NOT NULL,
          read_time       TEXT NOT NULL,
          image_url       TEXT NOT NULL,
          excerpt         TEXT NOT NULL,
          is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
          slug            TEXT NOT NULL UNIQUE,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS podcasts (
          id          SERIAL PRIMARY KEY,
          episode     TEXT NOT NULL,
          category    TEXT NOT NULL,
          title       TEXT NOT NULL,
          guest       TEXT NOT NULL,
          duration    TEXT NOT NULL,
          date        TEXT NOT NULL,
          image_url   TEXT NOT NULL,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS experts (
          id             SERIAL PRIMARY KEY,
          name           TEXT NOT NULL,
          role           TEXT NOT NULL,
          credentials    TEXT NOT NULL,
          article_count  INTEGER NOT NULL DEFAULT 0,
          image_url      TEXT NOT NULL,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS tips (
          id            SERIAL PRIMARY KEY,
          icon          TEXT NOT NULL,
          color_bg      TEXT NOT NULL,
          color_border  TEXT NOT NULL,
          title         TEXT NOT NULL,
          text          TEXT NOT NULL,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS plans (
          id             TEXT PRIMARY KEY,
          name           TEXT NOT NULL,
          monthly_price  TEXT NOT NULL,
          annual_price   TEXT NOT NULL,
          tagline        TEXT NOT NULL,
          features       TEXT NOT NULL,
          cta_label      TEXT NOT NULL,
          is_popular     BOOLEAN NOT NULL DEFAULT FALSE,
          sort_order     INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS app_meta (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_articles_cat ON articles(cat);
        CREATE INDEX IF NOT EXISTS idx_articles_is_premium ON articles(is_premium);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      `)
      return
    }

    // SQLite
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id        TEXT PRIMARY KEY,
        username       TEXT NOT NULL UNIQUE COLLATE NOCASE,
        role           TEXT NOT NULL CHECK (role IN ('admin', 'user')),
        password_hash  TEXT NOT NULL,
        created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS articles (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        cat             TEXT NOT NULL,
        category_label  TEXT NOT NULL,
        category_color  TEXT NOT NULL,
        title           TEXT NOT NULL,
        author          TEXT NOT NULL,
        date            TEXT NOT NULL,
        read_time       TEXT NOT NULL,
        image_url       TEXT NOT NULL,
        excerpt         TEXT NOT NULL,
        is_premium      INTEGER NOT NULL DEFAULT 0 CHECK (is_premium IN (0, 1)),
        slug            TEXT NOT NULL UNIQUE,
        created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS podcasts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        episode     TEXT NOT NULL,
        category    TEXT NOT NULL,
        title       TEXT NOT NULL,
        guest       TEXT NOT NULL,
        duration    TEXT NOT NULL,
        date        TEXT NOT NULL,
        image_url   TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS experts (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        name           TEXT NOT NULL,
        role           TEXT NOT NULL,
        credentials    TEXT NOT NULL,
        article_count  INTEGER NOT NULL DEFAULT 0,
        image_url      TEXT NOT NULL,
        created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tips (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        icon          TEXT NOT NULL,
        color_bg      TEXT NOT NULL,
        color_border  TEXT NOT NULL,
        title         TEXT NOT NULL,
        text          TEXT NOT NULL,
        created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS plans (
        id             TEXT PRIMARY KEY,
        name           TEXT NOT NULL,
        monthly_price  TEXT NOT NULL,
        annual_price   TEXT NOT NULL,
        tagline        TEXT NOT NULL,
        features       TEXT NOT NULL,
        cta_label      TEXT NOT NULL,
        is_popular     INTEGER NOT NULL DEFAULT 0 CHECK (is_popular IN (0, 1)),
        sort_order     INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS app_meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_articles_cat ON articles(cat);
      CREATE INDEX IF NOT EXISTS idx_articles_is_premium ON articles(is_premium);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `)
  },

  async down(db: DbAdapter) {
    if (db.dialect === 'postgres') {
      await db.exec(`
        DROP INDEX IF EXISTS idx_users_role;
        DROP INDEX IF EXISTS idx_articles_is_premium;
        DROP INDEX IF EXISTS idx_articles_cat;
        DROP TABLE IF EXISTS app_meta;
        DROP TABLE IF EXISTS plans;
        DROP TABLE IF EXISTS tips;
        DROP TABLE IF EXISTS experts;
        DROP TABLE IF EXISTS podcasts;
        DROP TABLE IF EXISTS articles;
        DROP INDEX IF EXISTS users_username_lower_uq;
        DROP TABLE IF EXISTS users;
      `)
      return
    }
    await db.exec(`
      DROP INDEX IF EXISTS idx_users_role;
      DROP INDEX IF EXISTS idx_articles_is_premium;
      DROP INDEX IF EXISTS idx_articles_cat;
      DROP TABLE IF EXISTS app_meta;
      DROP TABLE IF EXISTS plans;
      DROP TABLE IF EXISTS tips;
      DROP TABLE IF EXISTS experts;
      DROP TABLE IF EXISTS podcasts;
      DROP TABLE IF EXISTS articles;
      DROP TABLE IF EXISTS users;
    `)
  },
}

export default migration
