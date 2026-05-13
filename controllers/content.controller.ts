import type { RequestHandler } from 'express'
import { articleRepo, expertRepo, planRepo, podcastRepo, tipRepo } from '../data/store'
import { logger } from '../logger'

function parseId(raw: string): number | null {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

export const listArticles: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await articleRepo.list())
  } catch (err) {
    next(err)
  }
}

export const listBlogs: RequestHandler = async (req, res, next) => {
  try {
    const featured =
      req.query.featured === undefined
        ? undefined
        : String(req.query.featured).toLowerCase() === 'true'
    const sort = req.query.sort === 'popular' ? 'popular' : 'latest'
    const category =
      typeof req.query.category === 'string' && req.query.category.trim().length > 0
        ? req.query.category.trim()
        : undefined
    const limitRaw = Number(req.query.limit)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(100, limitRaw) : undefined

    const blogs = await articleRepo.listBlogs({ featured, sort, category, limit })
    res.json(blogs)
  } catch (err) {
    next(err)
  }
}

export const listBlogCategories: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await articleRepo.listBlogCategories())
  } catch (err) {
    next(err)
  }
}

export const getBlogBySlug: RequestHandler = async (req, res, next) => {
  const slug = typeof req.params.slug === 'string' ? req.params.slug.trim() : ''
  if (!slug) {
    res.status(400).json({ error: 'Invalid slug' })
    return
  }
  try {
    const blog = await articleRepo.bySlug(slug)
    if (!blog) {
      res.status(404).json({ error: 'Blog not found' })
      return
    }
    res.json(blog)
  } catch (err) {
    next(err)
  }
}

export const listPodcasts: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await podcastRepo.list())
  } catch (err) {
    next(err)
  }
}

export const listExperts: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await expertRepo.list())
  } catch (err) {
    next(err)
  }
}

export const getExpertById: RequestHandler = async (req, res, next) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(400).json({ error: 'Invalid id' })
    return
  }
  try {
    const expert = await expertRepo.byId(id)
    if (!expert) {
      res.status(404).json({ error: 'Expert not found' })
      return
    }
    res.json(expert)
  } catch (err) {
    next(err)
  }
}

export const listArticlesByExpert: RequestHandler = async (req, res, next) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(400).json({ error: 'Invalid id' })
    return
  }
  try {
    const expert = await expertRepo.byId(id)
    if (!expert) {
      res.status(404).json({ error: 'Expert not found' })
      return
    }
    res.json(await articleRepo.listByExpert({ id: expert.id, name: expert.name }))
  } catch (err) {
    next(err)
  }
}

export const listTips: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await tipRepo.list())
  } catch (err) {
    next(err)
  }
}

export const listPlans: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await planRepo.list())
  } catch (err) {
    next(err)
  }
}

export const getUserStats: RequestHandler = (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  logger.debug(`[ContentController] User stats requested by userId: ${req.user.userId}`)
  res.json({
    streakCount: 14,
    articlesRead: 47,
    podcastsListened: 12,
    aiQueries: 28,
  })
}

export const getFeatureFlags: RequestHandler = (_req, res) => {
  res.json({
    aiEnabled: true,
    podcastsEnabled: true,
    videosEnabled: true,
  })
}
