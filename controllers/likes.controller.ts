import type { RequestHandler } from 'express'
import { likesRepo } from '../data/store'

function parseContentId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const id = raw.trim()
  if (!id || id.length > 100) return null
  return id
}

const VALID_TYPES = ['article', 'podcast', 'blog', 'video'] as const
type ContentType = typeof VALID_TYPES[number]

function parseContentType(raw: unknown): ContentType | null {
  if (typeof raw !== 'string') return null
  return VALID_TYPES.includes(raw as ContentType) ? (raw as ContentType) : null
}

// POST /api/likes/:contentType/:contentId — toggle like
export const toggleLike: RequestHandler = async (req, res, next) => {
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
  try {
    const result = await likesRepo.toggle(req.user.userId, contentType, contentId)
    res.json(result)  // { liked: true/false, count: 42 }
  } catch (err) {
    next(err)
  }
}

// GET /api/likes/:contentType/:contentId — count + user ne like kiya hai ya nahi
export const getLikeStatus: RequestHandler = async (req, res, next) => {
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
    const count = await likesRepo.getCount(contentType, contentId)
    const liked = req.user
      ? await likesRepo.hasLiked(req.user.userId, contentType, contentId)
      : false
    res.json({ liked, count })
  } catch (err) {
    next(err)
  }
}

// GET /api/likes/me — user ki saari liked content
export const getMyLikes: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  try {
    res.json(await likesRepo.listByUser(req.user.userId))
  } catch (err) {
    next(err)
  }
}



export const getBatchLikeStatus: RequestHandler = async (req, res, next) => {
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
    // Saare counts ek saath
    const counts = await likesRepo.getCounts(type, contentIds)

    // User ne kya like kiya — sirf agar logged in ho
    const liked: Record<string, boolean> = {}
    if (req.user) {
      await Promise.all(
        contentIds.map(async (id) => {
          liked[id] = await likesRepo.hasLiked(req.user!.userId, type, id)
        })
      )
    }

    res.json({ counts, liked })
  } catch (err) {
    next(err)
  }
}