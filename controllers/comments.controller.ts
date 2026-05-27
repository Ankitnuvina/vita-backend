import type { RequestHandler } from 'express'
import { commentsRepo } from '../data/store'

const VALID_TYPES = ['article', 'podcast', 'blog', 'video'] as const
type ContentType = typeof VALID_TYPES[number]

function parseContentType(raw: unknown): ContentType | null {
  if (typeof raw !== 'string') return null
  return VALID_TYPES.includes(raw as ContentType) ? (raw as ContentType) : null
}

function parseContentId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const id = raw.trim()
  return id && id.length <= 100 ? id : null
}

// POST /api/comments/:contentType/:contentId
export const addComment: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const contentType = parseContentType(req.params.contentType)
  if (!contentType) {
    res.status(400).json({ error: 'Invalid content type' })
    return
  }

  const contentId = parseContentId(req.params.contentId)
  if (!contentId) {
    res.status(400).json({ error: 'Invalid content id' })
    return
  }

  const text = typeof req.body.text === 'string' ? req.body.text.trim() : ''
  if (!text || text.length < 1) {
    res.status(400).json({ error: 'Comment text required' })
    return
  }

  try {
    const comment = await commentsRepo.add(req.user.userId, contentType, contentId, text)
    res.status(201).json(comment)
  } catch (err) {
    next(err)
  }
}

// GET /api/comments/:contentType/:contentId
export const listComments: RequestHandler = async (req, res, next) => {
  const contentType = parseContentType(req.params.contentType)
  if (!contentType) {
    res.status(400).json({ error: 'Invalid content type' })
    return
  }

  const contentId = parseContentId(req.params.contentId)
  if (!contentId) {
    res.status(400).json({ error: 'Invalid content id' })
    return
  }

  const page = Math.max(1, Number(req.query.page ?? 1))
  const pageSize = Math.max(1, Math.min(50, Number(req.query.pageSize ?? 20)))

  try {
    const result = await commentsRepo.list(contentType, contentId, page, pageSize)
    res.json({ ...result, page, pageSize })
  } catch (err) {
    next(err)
  }
}

// GET /api/comments/:contentType/:contentId/count
export const getCommentCount: RequestHandler = async (req, res, next) => {
  const contentType = parseContentType(req.params.contentType)
  if (!contentType) {
    res.status(400).json({ error: 'Invalid content type' })
    return
  }

  const contentId = parseContentId(req.params.contentId)
  if (!contentId) {
    res.status(400).json({ error: 'Invalid content id' })
    return
  }

  try {
    const count = await commentsRepo.getCount(contentType, contentId)
    res.json({ count })
  } catch (err) {
    next(err)
  }
}

// POST /api/comments/batch-count
export const getBatchCommentCount: RequestHandler = async (req, res, next) => {
  const { contentType, contentIds } = req.body as {
    contentType: string
    contentIds: string[]
  }

  const type = parseContentType(contentType)
  if (!type) {
    res.status(400).json({ error: 'Invalid content type' })
    return
  }
  if (!Array.isArray(contentIds) || contentIds.length === 0) {
    res.status(400).json({ error: 'contentIds must be a non-empty array' })
    return
  }

  try {
    const counts = await commentsRepo.getCounts(type, contentIds)
    res.json({ counts })
  } catch (err) {
    next(err)
  }
}







// PUT /api/comments/:commentId
export const editComment: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const commentId = req.params.commentId?.trim()
  if (!commentId) {
    res.status(400).json({ error: 'Invalid comment id' })
    return
  }

  const text = typeof req.body.text === 'string' ? req.body.text.trim() : ''
  if (!text) {
    res.status(400).json({ error: 'Comment text required' })
    return
  }

  try {
    const updated = await commentsRepo.update(commentId, req.user.userId, text)
    if (!updated) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }
    res.json(updated)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      res.status(403).json({ error: 'Not your comment' })
      return
    }
    next(err)
  }
}

// DELETE /api/comments/:commentId
export const deleteComment: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const commentId = req.params.commentId?.trim()
  if (!commentId) {
    res.status(400).json({ error: 'Invalid comment id' })
    return
  }

  try {
    const result = await commentsRepo.remove(commentId, req.user.userId)

    if (result === 'notfound') {
      res.status(404).json({ error: 'Comment not found' })
      return
    }
    if (result === 'forbidden') {
      res.status(403).json({ error: 'Not your comment' })
      return
    }

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}