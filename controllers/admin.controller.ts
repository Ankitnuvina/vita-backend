import type { Request, RequestHandler, Response } from 'express'
import { ZodError, type ZodRawShape, type ZodObject } from 'zod'
import {
  articleRepo,
  expertRepo,
  metaRepo,
  podcastRepo,
  tipRepo,
} from '../data/store'
import { articleSchema, expertSchema, podcastSchema, tipSchema } from '../schemas'
import { logger } from '../logger'

interface Repo<TFull extends { id: number }, TInput> {
  list: () => Promise<TFull[]>
  byId: (id: number) => Promise<TFull | undefined>
  create: (data: TInput) => Promise<TFull>
  update: (id: number, data: Partial<TInput>) => Promise<TFull | undefined>
  remove: (id: number) => Promise<boolean>
}

function parseId(req: Request, res: Response): number | null {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid id' })
    return null
  }
  return id
}

function paginate<T>(items: T[], req: Request): { data: T[]; total: number; page: number; pageSize: number } {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize ?? 25)))
  const start = (page - 1) * pageSize
  return {
    data: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  }
}

function buildHandlers<TFull extends { id: number }, TShape extends ZodRawShape>(
  resource: string,
  schema: ZodObject<TShape>,
  repo: Repo<TFull, ZodObject<TShape>['_output']>
): {
  list: RequestHandler
  create: RequestHandler
  update: RequestHandler
  remove: RequestHandler
} {
  return {
    list: async (req, res, next) => {
      try {
        const items = await repo.list()
        res.json(paginate(items, req))
      } catch (err) {
        next(err)
      }
    },
    create: async (req, res, next) => {
      try {
        const data = schema.parse(req.body)
        const created = await repo.create(data)
        logger.info(`[AdminController] ${resource} created`, { id: created.id, by: req.user?.userId })
        res.status(201).json(created)
      } catch (err) {
        if (err instanceof ZodError) {
          res.status(400).json({ error: 'Validation failed', details: err.issues })
          return
        }
        next(err)
      }
    },
    update: async (req, res, next) => {
      const id = parseId(req, res)
      if (id === null) return
      try {
        const data = schema.partial().parse(req.body)
        const updated = await repo.update(id, data)
        if (!updated) {
          res.status(404).json({ error: `${resource} not found` })
          return
        }
        logger.info(`[AdminController] ${resource} updated`, { id, by: req.user?.userId })
        res.json(updated)
      } catch (err) {
        if (err instanceof ZodError) {
          res.status(400).json({ error: 'Validation failed', details: err.issues })
          return
        }
        next(err)
      }
    },
    remove: async (req, res, next) => {
      const id = parseId(req, res)
      if (id === null) return
      try {
        const ok = await repo.remove(id)
        if (!ok) {
          res.status(404).json({ error: `${resource} not found` })
          return
        }
        logger.info(`[AdminController] ${resource} deleted`, { id, by: req.user?.userId })
        res.status(204).send()
      } catch (err) {
        next(err)
      }
    },
  }
}

export const articleHandlers = buildHandlers('article', articleSchema, articleRepo)
export const podcastHandlers = buildHandlers('podcast', podcastSchema, podcastRepo)
export const expertHandlers = buildHandlers('expert', expertSchema, expertRepo)
export const tipHandlers = buildHandlers('tip', tipSchema, tipRepo)

export const getStats: RequestHandler = async (_req, res, next) => {
  try {
    const [articleCount, podcastCount, expertCount, subscriberCount] = await Promise.all([
      articleRepo.count(),
      podcastRepo.count(),
      expertRepo.count(),
      metaRepo.getSubscriberCount(),
    ])
    res.json({ articleCount, podcastCount, expertCount, subscriberCount })
  } catch (err) {
    next(err)
  }
}
