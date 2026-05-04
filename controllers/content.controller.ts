import type { RequestHandler } from 'express'
import { articleRepo, expertRepo, planRepo, podcastRepo, tipRepo } from '../data/store'
import { logger } from '../logger'

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
