import type { Collection } from 'mongodb'
import { Collections, getDb, nextId } from '../db/adapter'
import type { UserRole } from '../types'
import type {
  Article,
  Expert,
  Podcast,
  SubscriptionPlan,
  WellnessTip,
} from './seed'

/* -------------------------------------------------------------------------- */
/*  Public record types (unchanged from the SQL era — these are the API      */
/*  contracts the controllers + frontend rely on)                            */
/* -------------------------------------------------------------------------- */

export interface UserRecord {
  userId: string
  username: string
  role: UserRole
  passwordHash: string
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/*  Internal MongoDB document shapes                                          */
/*                                                                           */
/*  Numeric resources (articles/podcasts/experts/tips) use the integer id   */
/*  as `_id` directly, preserving the `id: number` API surface and giving   */
/*  us the primary index for free.                                          */
/* -------------------------------------------------------------------------- */

interface ArticleDoc {
  _id: number
  cat: string
  categoryLabel: string
  categoryColor: string
  title: string
  author: string
  date: string
  readTime: string
  imageUrl: string
  excerpt: string
  articleStatus: 'draft' | 'published' | 'scheduled'
  isPremium: boolean
  slug: string
  createdAt: Date
  sections?: Array<{ heading: string; items: string[] }>
  tags?: string[]
  seoTitle?: string
  seoDescription?: string
}

interface PodcastDoc {
  _id: number
  episode: string
  category: string
  title: string
  guest: string
  duration: string
  date: string
  imageUrl: string
  createdAt: Date
}

interface ExpertDoc {
  _id: number
  name: string
  role: string
  credentials: string
  articleCount: number
  imageUrl: string
  createdAt: Date
}

interface TipDoc {
  _id: number
  icon: string
  colors: { bg: string; border: string }
  title: string
  text: string
  createdAt: Date
}

interface PlanDoc {
  _id: string
  name: string
  monthlyPrice: string
  annualPrice: string
  tagline: string
  features: string[]
  ctaLabel: string
  isPopular: boolean
  sortOrder: number
}

interface UserDoc {
  /** Equals `userId` (e.g. "admin-1", "user-3"). */
  _id: string
  username: string
  /** Lower-cased copy used by the case-insensitive unique index. */
  usernameLower: string
  role: UserRole
  passwordHash: string
  createdAt: Date
}

interface AppMetaDoc {
  _id: string
  value: string
}

/* -------------------------------------------------------------------------- */
/*  Collection accessors                                                      */
/* -------------------------------------------------------------------------- */

function articlesCol(): Collection<ArticleDoc> {
  return getDb().collection<ArticleDoc>(Collections.articles)
}
function podcastsCol(): Collection<PodcastDoc> {
  return getDb().collection<PodcastDoc>(Collections.podcasts)
}
function expertsCol(): Collection<ExpertDoc> {
  return getDb().collection<ExpertDoc>(Collections.experts)
}
function tipsCol(): Collection<TipDoc> {
  return getDb().collection<TipDoc>(Collections.tips)
}
function plansCol(): Collection<PlanDoc> {
  return getDb().collection<PlanDoc>(Collections.plans)
}
function usersCol(): Collection<UserDoc> {
  return getDb().collection<UserDoc>(Collections.users)
}
function appMetaCol(): Collection<AppMetaDoc> {
  return getDb().collection<AppMetaDoc>(Collections.appMeta)
}

/* -------------------------------------------------------------------------- */
/*  Document → API mappers (preserve every output field exactly)             */
/* -------------------------------------------------------------------------- */

function docToArticle(d: ArticleDoc): Article {
  return {
    id: d._id,
    cat: d.cat,
    categoryLabel: d.categoryLabel,
    categoryColor: d.categoryColor,
    title: d.title,
    author: d.author,
    date: d.date,
    readTime: d.readTime,
    imageUrl: d.imageUrl,
    excerpt: d.excerpt,
    articleStatus: d.articleStatus,
    isPremium: d.isPremium,
    slug: d.slug,
    sections: d.sections,
    tags: d.tags,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
  }
}

function docToPodcast(d: PodcastDoc): Podcast {
  return {
    id: d._id,
    episode: d.episode,
    category: d.category,
    title: d.title,
    guest: d.guest,
    duration: d.duration,
    date: d.date,
    imageUrl: d.imageUrl,
  }
}

function docToExpert(d: ExpertDoc): Expert {
  return {
    id: d._id,
    name: d.name,
    role: d.role,
    credentials: d.credentials,
    articleCount: d.articleCount,
    imageUrl: d.imageUrl,
  }
}

function docToTip(d: TipDoc): WellnessTip {
  return {
    id: d._id,
    icon: d.icon,
    colors: { bg: d.colors.bg, border: d.colors.border },
    title: d.title,
    text: d.text,
  }
}

function docToPlan(d: PlanDoc): SubscriptionPlan {
  return {
    id: d._id,
    name: d.name,
    monthlyPrice: d.monthlyPrice,
    annualPrice: d.annualPrice,
    tagline: d.tagline,
    features: d.features,
    ctaLabel: d.ctaLabel,
    isPopular: d.isPopular,
  }
}

function docToUser(d: UserDoc): UserRecord {
  return {
    userId: d._id,
    username: d.username,
    role: d.role,
    passwordHash: d.passwordHash,
    /**
     * Stringified to match the SQL contract (which returned ISO/timestamp
     * strings, not Date objects). The frontend never inspects this — it's
     * only used internally — but keeping the shape stable avoids surprises.
     */
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
  }
}

/* -------------------------------------------------------------------------- */
/*  Articles                                                                  */
/* -------------------------------------------------------------------------- */

export const articleRepo = {
  async list(): Promise<Article[]> {
    const docs = await articlesCol().find({}).sort({ _id: -1 }).toArray()
    return docs.map(docToArticle)
  },
  async byId(id: number): Promise<Article | undefined> {
    const doc = await articlesCol().findOne({ _id: id })
    return doc ? docToArticle(doc) : undefined
  },
  async create(data: Omit<Article, 'id'>): Promise<Article> {
    const _id = await nextId('articles')
    const doc: ArticleDoc = {
      _id,
      cat: data.cat,
      categoryLabel: data.categoryLabel,
      categoryColor: data.categoryColor,
      title: data.title,
      author: data.author,
      date: data.date,
      readTime: data.readTime,
      imageUrl: data.imageUrl,
      excerpt: data.excerpt,
      articleStatus: data.articleStatus,
      isPremium: data.isPremium,
      slug: data.slug,
      sections: data.sections,
      tags: data.tags,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      createdAt: new Date(),
    }
    await articlesCol().insertOne(doc)
    return docToArticle(doc)
  },
  async update(id: number, data: Partial<Omit<Article, 'id'>>): Promise<Article | undefined> {
    const set: Partial<ArticleDoc> = {}
    if (data.cat !== undefined) set.cat = data.cat
    if (data.categoryLabel !== undefined) set.categoryLabel = data.categoryLabel
    if (data.categoryColor !== undefined) set.categoryColor = data.categoryColor
    if (data.title !== undefined) set.title = data.title
    if (data.author !== undefined) set.author = data.author
    if (data.date !== undefined) set.date = data.date
    if (data.readTime !== undefined) set.readTime = data.readTime
    if (data.imageUrl !== undefined) set.imageUrl = data.imageUrl
    if (data.excerpt !== undefined) set.excerpt = data.excerpt
    if (data.articleStatus !== undefined) set.articleStatus = data.articleStatus
    if (data.isPremium !== undefined) set.isPremium = data.isPremium
    if (data.slug !== undefined) set.slug = data.slug
    if (data.sections !== undefined) set.sections = data.sections
    if (data.tags !== undefined) set.tags = data.tags
    if (data.seoTitle !== undefined) set.seoTitle = data.seoTitle
    if (data.seoDescription !== undefined) set.seoDescription = data.seoDescription

    if (Object.keys(set).length === 0) return this.byId(id)
    const doc = await articlesCol().findOneAndUpdate(
      { _id: id },
      { $set: set },
      { returnDocument: 'after' }
    )
    return doc ? docToArticle(doc) : undefined
  },
  async remove(id: number): Promise<boolean> {
    const result = await articlesCol().deleteOne({ _id: id })
    return result.deletedCount > 0
  },
  async count(): Promise<number> {
    return articlesCol().countDocuments({})
  },
}

/* -------------------------------------------------------------------------- */
/*  Podcasts                                                                  */
/* -------------------------------------------------------------------------- */

export const podcastRepo = {
  async list(): Promise<Podcast[]> {
    const docs = await podcastsCol().find({}).sort({ _id: -1 }).toArray()
    return docs.map(docToPodcast)
  },
  async byId(id: number): Promise<Podcast | undefined> {
    const doc = await podcastsCol().findOne({ _id: id })
    return doc ? docToPodcast(doc) : undefined
  },
  async create(data: Omit<Podcast, 'id'>): Promise<Podcast> {
    const _id = await nextId('podcasts')
    const doc: PodcastDoc = {
      _id,
      episode: data.episode,
      category: data.category,
      title: data.title,
      guest: data.guest,
      duration: data.duration,
      date: data.date,
      imageUrl: data.imageUrl,
      createdAt: new Date(),
    }
    await podcastsCol().insertOne(doc)
    return docToPodcast(doc)
  },
  async update(id: number, data: Partial<Omit<Podcast, 'id'>>): Promise<Podcast | undefined> {
    const set: Partial<PodcastDoc> = {}
    if (data.episode !== undefined) set.episode = data.episode
    if (data.category !== undefined) set.category = data.category
    if (data.title !== undefined) set.title = data.title
    if (data.guest !== undefined) set.guest = data.guest
    if (data.duration !== undefined) set.duration = data.duration
    if (data.date !== undefined) set.date = data.date
    if (data.imageUrl !== undefined) set.imageUrl = data.imageUrl

    if (Object.keys(set).length === 0) return this.byId(id)
    const doc = await podcastsCol().findOneAndUpdate(
      { _id: id },
      { $set: set },
      { returnDocument: 'after' }
    )
    return doc ? docToPodcast(doc) : undefined
  },
  async remove(id: number): Promise<boolean> {
    const result = await podcastsCol().deleteOne({ _id: id })
    return result.deletedCount > 0
  },
  async count(): Promise<number> {
    return podcastsCol().countDocuments({})
  },
}

/* -------------------------------------------------------------------------- */
/*  Experts                                                                   */
/* -------------------------------------------------------------------------- */

export const expertRepo = {
  async list(): Promise<Expert[]> {
    const docs = await expertsCol().find({}).sort({ _id: -1 }).toArray()
    return docs.map(docToExpert)
  },
  async byId(id: number): Promise<Expert | undefined> {
    const doc = await expertsCol().findOne({ _id: id })
    return doc ? docToExpert(doc) : undefined
  },
  async create(data: Omit<Expert, 'id'>): Promise<Expert> {
    const _id = await nextId('experts')
    const doc: ExpertDoc = {
      _id,
      name: data.name,
      role: data.role,
      credentials: data.credentials,
      articleCount: data.articleCount,
      imageUrl: data.imageUrl,
      createdAt: new Date(),
    }
    await expertsCol().insertOne(doc)
    return docToExpert(doc)
  },
  async update(id: number, data: Partial<Omit<Expert, 'id'>>): Promise<Expert | undefined> {
    const set: Partial<ExpertDoc> = {}
    if (data.name !== undefined) set.name = data.name
    if (data.role !== undefined) set.role = data.role
    if (data.credentials !== undefined) set.credentials = data.credentials
    if (data.articleCount !== undefined) set.articleCount = data.articleCount
    if (data.imageUrl !== undefined) set.imageUrl = data.imageUrl

    if (Object.keys(set).length === 0) return this.byId(id)
    const doc = await expertsCol().findOneAndUpdate(
      { _id: id },
      { $set: set },
      { returnDocument: 'after' }
    )
    return doc ? docToExpert(doc) : undefined
  },
  async remove(id: number): Promise<boolean> {
    const result = await expertsCol().deleteOne({ _id: id })
    return result.deletedCount > 0
  },
  async count(): Promise<number> {
    return expertsCol().countDocuments({})
  },
}

/* -------------------------------------------------------------------------- */
/*  Wellness tips                                                             */
/* -------------------------------------------------------------------------- */

export const tipRepo = {
  async list(): Promise<WellnessTip[]> {
    const docs = await tipsCol().find({}).sort({ _id: -1 }).toArray()
    return docs.map(docToTip)
  },
  async byId(id: number): Promise<WellnessTip | undefined> {
    const doc = await tipsCol().findOne({ _id: id })
    return doc ? docToTip(doc) : undefined
  },
  async create(data: Omit<WellnessTip, 'id'>): Promise<WellnessTip> {
    const _id = await nextId('tips')
    const doc: TipDoc = {
      _id,
      icon: data.icon,
      colors: { bg: data.colors.bg, border: data.colors.border },
      title: data.title,
      text: data.text,
      createdAt: new Date(),
    }
    await tipsCol().insertOne(doc)
    return docToTip(doc)
  },
  async update(id: number, data: Partial<Omit<WellnessTip, 'id'>>): Promise<WellnessTip | undefined> {
    const set: Partial<TipDoc> = {}
    if (data.icon !== undefined) set.icon = data.icon
    if (data.colors !== undefined) set.colors = { bg: data.colors.bg, border: data.colors.border }
    if (data.title !== undefined) set.title = data.title
    if (data.text !== undefined) set.text = data.text

    if (Object.keys(set).length === 0) return this.byId(id)
    const doc = await tipsCol().findOneAndUpdate(
      { _id: id },
      { $set: set },
      { returnDocument: 'after' }
    )
    return doc ? docToTip(doc) : undefined
  },
  async remove(id: number): Promise<boolean> {
    const result = await tipsCol().deleteOne({ _id: id })
    return result.deletedCount > 0
  },
}

/* -------------------------------------------------------------------------- */
/*  Subscription plans (read-only via API)                                    */
/* -------------------------------------------------------------------------- */

export const planRepo = {
  async list(): Promise<SubscriptionPlan[]> {
    const docs = await plansCol().find({}).sort({ sortOrder: 1, _id: 1 }).toArray()
    return docs.map(docToPlan)
  },
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                     */
/* -------------------------------------------------------------------------- */

export const userRepo = {
  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const doc = await usersCol().findOne({ usernameLower: username.toLowerCase() })
    return doc ? docToUser(doc) : undefined
  },
  async findByUserId(userId: string): Promise<UserRecord | undefined> {
    const doc = await usersCol().findOne({ _id: userId })
    return doc ? docToUser(doc) : undefined
  },
  async exists(username: string): Promise<boolean> {
    return (await this.findByUsername(username)) !== undefined
  },
  async create(input: { username: string; role: UserRole; passwordHash: string }): Promise<UserRecord> {
    const idPrefix = input.role === 'admin' ? 'admin' : 'user'
    const sameRoleCount = await usersCol().countDocuments({ role: input.role })
    const next = sameRoleCount + 1
    let userId = `${idPrefix}-${next}`

    while (await usersCol().findOne({ _id: userId })) {
      userId = `${idPrefix}-${next + Math.floor(Math.random() * 1_000_000)}`
    }

    const doc: UserDoc = {
      _id: userId,
      username: input.username,
      usernameLower: input.username.toLowerCase(),
      role: input.role,
      passwordHash: input.passwordHash,
      createdAt: new Date(),
    }
    await usersCol().insertOne(doc)
    return docToUser(doc)
  },
  async count(role?: UserRole): Promise<number> {
    if (role) return usersCol().countDocuments({ role })
    return usersCol().countDocuments({})
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
    const doc = await appMetaCol().findOne({ _id: key })
    return doc?.value
  },
  async setString(key: string, value: string): Promise<void> {
    await appMetaCol().updateOne(
      { _id: key },
      { $set: { value } },
      { upsert: true }
    )
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
