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
