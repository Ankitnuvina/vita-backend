import type { RequestHandler } from 'express'
import { ZodError } from 'zod'
import { mediaProgressRepo } from '../data/store'
import { mediaProgressSchema } from '../schemas'

function parseMediaId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const mediaId = raw.trim()
  if (!mediaId || mediaId.length > 200) return null
  return mediaId
}

export const listMediaProgress: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  try {
    res.json(await mediaProgressRepo.list(req.user.userId))
  } catch (err) {
    next(err)
  }
}

export const getMediaProgress: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  const mediaId = parseMediaId(req.params.mediaId)
  if (!mediaId) {
    res.status(400).json({ error: 'Invalid media id' })
    return
  }
  try {
    const record = await mediaProgressRepo.get(req.user.userId, mediaId)
    if (!record) {
      res.status(404).json({ error: 'Progress not found' })
      return
    }
    res.json(record)
  } catch (err) {
    next(err)
  }
}

export const saveMediaProgress: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  const mediaId = parseMediaId(req.params.mediaId)
  if (!mediaId) {
    res.status(400).json({ error: 'Invalid media id' })
    return
  }
  try {
    const payload = mediaProgressSchema.parse(req.body)
    const record = await mediaProgressRepo.upsert({
      userId: req.user.userId,
      mediaId,
      kind: payload.kind,
      positionSec: payload.positionSec,
      durationSec: payload.durationSec,
    })
    res.status(200).json(record)
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.issues })
      return
    }
    next(err)
  }
}

export const clearMediaProgress: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  const mediaId = parseMediaId(req.params.mediaId)
  if (!mediaId) {
    res.status(400).json({ error: 'Invalid media id' })
    return
  }
  try {
    const deleted = await mediaProgressRepo.remove(req.user.userId, mediaId)
    if (!deleted) {
      res.status(404).json({ error: 'Progress not found' })
      return
    }
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
