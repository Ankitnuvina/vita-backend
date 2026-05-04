import { getDb } from '../db/adapter'
import type { DbAdapter } from '../db/adapter'
import type { UserRole } from '../types'
import type {
  Article,
  Expert,
  Podcast,
  SubscriptionPlan,
  WellnessTip,
} from './seed'

export interface UserRecord {
  userId: string
  username: string
  role: UserRole
  passwordHash: string
  createdAt: string
}

interface ArticleRow {
  id: number
  cat: string
  category_label: string
  category_color: string
  title: string
  author: string
  date: string
  read_time: string
  image_url: string
  excerpt: string
  is_premium: number | boolean
  slug: string
}

interface PodcastRow {
  id: number
  episode: string
  category: string
  title: string
  guest: string
  duration: string
  date: string
  image_url: string
}

interface ExpertRow {
  id: number
  name: string
  role: string
  credentials: string
  article_count: number
  image_url: string
}

interface TipRow {
  id: number
  icon: string
  color_bg: string
  color_border: string
  title: string
  text: string
}

interface PlanRow {
  id: string
  name: string
  monthly_price: string
  annual_price: string
  tagline: string
  features: string
  cta_label: string
  is_popular: number | boolean
  sort_order: number
}

interface UserRow {
  user_id: string
  username: string
  role: UserRole
  password_hash: string
  created_at: string
}

function db(): DbAdapter {
  return getDb()
}

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 't' || v === 'true'
}

/** Encode a JS boolean for the active driver (BOOL on Postgres, 0/1 on SQLite). */
function encBool(v: boolean): boolean | number {
  return db().dialect === 'postgres' ? v : v ? 1 : 0
}

function rowToArticle(r: ArticleRow): Article {
  return {
    id: r.id,
    cat: r.cat,
    categoryLabel: r.category_label,
    categoryColor: r.category_color,
    title: r.title,
    author: r.author,
    date: r.date,
    readTime: r.read_time,
    imageUrl: r.image_url,
    excerpt: r.excerpt,
    isPremium: asBool(r.is_premium),
    slug: r.slug,
  }
}

function rowToPodcast(r: PodcastRow): Podcast {
  return {
    id: r.id,
    episode: r.episode,
    category: r.category,
    title: r.title,
    guest: r.guest,
    duration: r.duration,
    date: r.date,
    imageUrl: r.image_url,
  }
}

function rowToExpert(r: ExpertRow): Expert {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    credentials: r.credentials,
    articleCount: r.article_count,
    imageUrl: r.image_url,
  }
}

function rowToTip(r: TipRow): WellnessTip {
  return {
    id: r.id,
    icon: r.icon,
    colors: { bg: r.color_bg, border: r.color_border },
    title: r.title,
    text: r.text,
  }
}

function rowToPlan(r: PlanRow): SubscriptionPlan {
  return {
    id: r.id,
    name: r.name,
    monthlyPrice: r.monthly_price,
    annualPrice: r.annual_price,
    tagline: r.tagline,
    features: JSON.parse(r.features) as string[],
    ctaLabel: r.cta_label,
    isPopular: asBool(r.is_popular),
  }
}

function rowToUser(r: UserRow): UserRecord {
  return {
    userId: r.user_id,
    username: r.username,
    role: r.role,
    passwordHash: r.password_hash,
    createdAt: r.created_at,
  }
}

/* -------------------------------------------------------------------------- */
/*  Articles                                                                  */
/* -------------------------------------------------------------------------- */

export const articleRepo = {
  async list(): Promise<Article[]> {
    const rows = await db().query<ArticleRow>('SELECT * FROM articles ORDER BY id DESC')
    return rows.map(rowToArticle)
  },
  async byId(id: number): Promise<Article | undefined> {
    const row = await db().get<ArticleRow>('SELECT * FROM articles WHERE id = ?', [id])
    return row ? rowToArticle(row) : undefined
  },
  async create(data: Omit<Article, 'id'>): Promise<Article> {
    const row = await db().get<{ id: number }>(
      `INSERT INTO articles
         (cat, category_label, category_color, title, author, date, read_time, image_url, excerpt, is_premium, slug)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        data.cat,
        data.categoryLabel,
        data.categoryColor,
        data.title,
        data.author,
        data.date,
        data.readTime,
        data.imageUrl,
        data.excerpt,
        encBool(data.isPremium),
        data.slug,
      ]
    )
    return { id: Number(row?.id ?? 0), ...data }
  },
  async update(id: number, data: Partial<Omit<Article, 'id'>>): Promise<Article | undefined> {
    const map: Record<string, string> = {
      cat: 'cat',
      categoryLabel: 'category_label',
      categoryColor: 'category_color',
      title: 'title',
      author: 'author',
      date: 'date',
      readTime: 'read_time',
      imageUrl: 'image_url',
      excerpt: 'excerpt',
      isPremium: 'is_premium',
      slug: 'slug',
    }
    const sets: string[] = []
    const values: unknown[] = []
    for (const [key, value] of Object.entries(data)) {
      const col = map[key]
      if (!col) continue
      sets.push(`${col} = ?`)
      values.push(key === 'isPremium' ? encBool(value as boolean) : value)
    }
    if (sets.length === 0) return this.byId(id)
    values.push(id)
    const result = await db().run(`UPDATE articles SET ${sets.join(', ')} WHERE id = ?`, values)
    if (result.changes === 0) return undefined
    return this.byId(id)
  },
  async remove(id: number): Promise<boolean> {
    const result = await db().run('DELETE FROM articles WHERE id = ?', [id])
    return result.changes > 0
  },
  async count(): Promise<number> {
    const row = await db().get<{ c: number | string }>('SELECT COUNT(*) AS c FROM articles')
    return Number(row?.c ?? 0)
  },
}

/* -------------------------------------------------------------------------- */
/*  Podcasts                                                                  */
/* -------------------------------------------------------------------------- */

export const podcastRepo = {
  async list(): Promise<Podcast[]> {
    const rows = await db().query<PodcastRow>('SELECT * FROM podcasts ORDER BY id DESC')
    return rows.map(rowToPodcast)
  },
  async byId(id: number): Promise<Podcast | undefined> {
    const row = await db().get<PodcastRow>('SELECT * FROM podcasts WHERE id = ?', [id])
    return row ? rowToPodcast(row) : undefined
  },
  async create(data: Omit<Podcast, 'id'>): Promise<Podcast> {
    const row = await db().get<{ id: number }>(
      `INSERT INTO podcasts (episode, category, title, guest, duration, date, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [data.episode, data.category, data.title, data.guest, data.duration, data.date, data.imageUrl]
    )
    return { id: Number(row?.id ?? 0), ...data }
  },
  async update(id: number, data: Partial<Omit<Podcast, 'id'>>): Promise<Podcast | undefined> {
    const map: Record<string, string> = {
      episode: 'episode',
      category: 'category',
      title: 'title',
      guest: 'guest',
      duration: 'duration',
      date: 'date',
      imageUrl: 'image_url',
    }
    const sets: string[] = []
    const values: unknown[] = []
    for (const [key, value] of Object.entries(data)) {
      const col = map[key]
      if (!col) continue
      sets.push(`${col} = ?`)
      values.push(value)
    }
    if (sets.length === 0) return this.byId(id)
    values.push(id)
    const result = await db().run(`UPDATE podcasts SET ${sets.join(', ')} WHERE id = ?`, values)
    if (result.changes === 0) return undefined
    return this.byId(id)
  },
  async remove(id: number): Promise<boolean> {
    const result = await db().run('DELETE FROM podcasts WHERE id = ?', [id])
    return result.changes > 0
  },
  async count(): Promise<number> {
    const row = await db().get<{ c: number | string }>('SELECT COUNT(*) AS c FROM podcasts')
    return Number(row?.c ?? 0)
  },
}

/* -------------------------------------------------------------------------- */
/*  Experts                                                                   */
/* -------------------------------------------------------------------------- */

export const expertRepo = {
  async list(): Promise<Expert[]> {
    const rows = await db().query<ExpertRow>('SELECT * FROM experts ORDER BY id DESC')
    return rows.map(rowToExpert)
  },
  async byId(id: number): Promise<Expert | undefined> {
    const row = await db().get<ExpertRow>('SELECT * FROM experts WHERE id = ?', [id])
    return row ? rowToExpert(row) : undefined
  },
  async create(data: Omit<Expert, 'id'>): Promise<Expert> {
    const row = await db().get<{ id: number }>(
      `INSERT INTO experts (name, role, credentials, article_count, image_url)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id`,
      [data.name, data.role, data.credentials, data.articleCount, data.imageUrl]
    )
    return { id: Number(row?.id ?? 0), ...data }
  },
  async update(id: number, data: Partial<Omit<Expert, 'id'>>): Promise<Expert | undefined> {
    const map: Record<string, string> = {
      name: 'name',
      role: 'role',
      credentials: 'credentials',
      articleCount: 'article_count',
      imageUrl: 'image_url',
    }
    const sets: string[] = []
    const values: unknown[] = []
    for (const [key, value] of Object.entries(data)) {
      const col = map[key]
      if (!col) continue
      sets.push(`${col} = ?`)
      values.push(value)
    }
    if (sets.length === 0) return this.byId(id)
    values.push(id)
    const result = await db().run(`UPDATE experts SET ${sets.join(', ')} WHERE id = ?`, values)
    if (result.changes === 0) return undefined
    return this.byId(id)
  },
  async remove(id: number): Promise<boolean> {
    const result = await db().run('DELETE FROM experts WHERE id = ?', [id])
    return result.changes > 0
  },
  async count(): Promise<number> {
    const row = await db().get<{ c: number | string }>('SELECT COUNT(*) AS c FROM experts')
    return Number(row?.c ?? 0)
  },
}

/* -------------------------------------------------------------------------- */
/*  Wellness tips                                                             */
/* -------------------------------------------------------------------------- */

export const tipRepo = {
  async list(): Promise<WellnessTip[]> {
    const rows = await db().query<TipRow>('SELECT * FROM tips ORDER BY id DESC')
    return rows.map(rowToTip)
  },
  async byId(id: number): Promise<WellnessTip | undefined> {
    const row = await db().get<TipRow>('SELECT * FROM tips WHERE id = ?', [id])
    return row ? rowToTip(row) : undefined
  },
  async create(data: Omit<WellnessTip, 'id'>): Promise<WellnessTip> {
    const row = await db().get<{ id: number }>(
      `INSERT INTO tips (icon, color_bg, color_border, title, text)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id`,
      [data.icon, data.colors.bg, data.colors.border, data.title, data.text]
    )
    return { id: Number(row?.id ?? 0), ...data }
  },
  async update(id: number, data: Partial<Omit<WellnessTip, 'id'>>): Promise<WellnessTip | undefined> {
    const sets: string[] = []
    const values: unknown[] = []
    if (data.icon !== undefined) {
      sets.push('icon = ?')
      values.push(data.icon)
    }
    if (data.colors !== undefined) {
      sets.push('color_bg = ?', 'color_border = ?')
      values.push(data.colors.bg, data.colors.border)
    }
    if (data.title !== undefined) {
      sets.push('title = ?')
      values.push(data.title)
    }
    if (data.text !== undefined) {
      sets.push('text = ?')
      values.push(data.text)
    }
    if (sets.length === 0) return this.byId(id)
    values.push(id)
    const result = await db().run(`UPDATE tips SET ${sets.join(', ')} WHERE id = ?`, values)
    if (result.changes === 0) return undefined
    return this.byId(id)
  },
  async remove(id: number): Promise<boolean> {
    const result = await db().run('DELETE FROM tips WHERE id = ?', [id])
    return result.changes > 0
  },
}

/* -------------------------------------------------------------------------- */
/*  Subscription plans (read-only via API)                                    */
/* -------------------------------------------------------------------------- */

export const planRepo = {
  async list(): Promise<SubscriptionPlan[]> {
    const rows = await db().query<PlanRow>(
      'SELECT * FROM plans ORDER BY sort_order ASC, id ASC'
    )
    return rows.map(rowToPlan)
  },
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                     */
/* -------------------------------------------------------------------------- */

export const userRepo = {
  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const row = await db().get<UserRow>(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
      [username]
    )
    return row ? rowToUser(row) : undefined
  },
  async findByUserId(userId: string): Promise<UserRecord | undefined> {
    const row = await db().get<UserRow>('SELECT * FROM users WHERE user_id = ?', [userId])
    return row ? rowToUser(row) : undefined
  },
  async exists(username: string): Promise<boolean> {
    return (await this.findByUsername(username)) !== undefined
  },
  async create(input: { username: string; role: UserRole; passwordHash: string }): Promise<UserRecord> {
    const idPrefix = input.role === 'admin' ? 'admin' : 'user'
    const row = await db().get<{ c: number | string }>(
      'SELECT COUNT(*) AS c FROM users WHERE role = ?',
      [input.role]
    )
    const next = Number(row?.c ?? 0) + 1
    let userId = `${idPrefix}-${next}`

    while (await this.findByUserId(userId)) {
      userId = `${idPrefix}-${next + Math.floor(Math.random() * 1_000_000)}`
    }

    await db().run(
      'INSERT INTO users (user_id, username, role, password_hash) VALUES (?, ?, ?, ?)',
      [userId, input.username, input.role, input.passwordHash]
    )
    return (await this.findByUserId(userId))!
  },
  async count(role?: UserRole): Promise<number> {
    if (role) {
      const r = await db().get<{ c: number | string }>(
        'SELECT COUNT(*) AS c FROM users WHERE role = ?',
        [role]
      )
      return Number(r?.c ?? 0)
    }
    const r = await db().get<{ c: number | string }>('SELECT COUNT(*) AS c FROM users')
    return Number(r?.c ?? 0)
  },
}

/* -------------------------------------------------------------------------- */
/*  App-wide metadata                                                         */
/* -------------------------------------------------------------------------- */

const META_KEYS = {
  subscriberCount: 'subscriberCount',
} as const

export const metaRepo = {
  async getString(key: string): Promise<string | undefined> {
    const row = await db().get<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [key])
    return row?.value
  },
  async setString(key: string, value: string): Promise<void> {
    const sql =
      db().dialect === 'postgres'
        ? 'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value'
        : 'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    await db().run(sql, [key, value])
  },
  async getNumber(key: string, fallback = 0): Promise<number> {
    const v = await this.getString(key)
    if (v === undefined) return fallback
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  },
  async getSubscriberCount(): Promise<number> {
    return this.getNumber(META_KEYS.subscriberCount, 0)
  },
}
