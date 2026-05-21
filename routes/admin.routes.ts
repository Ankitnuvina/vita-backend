import { Router } from 'express'
import {
  articleHandlers,
  expertHandlers,
  getStats,
  podcastHandlers,
  tipHandlers,
  getLikesAnalytics 
} from '../controllers/admin.controller'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireAuth } from '../middleware/requireAuth'

import { handleUpload, uploadImage, uploadVideo } from '@/middleware/upload'
import { config } from '../config'

const router = Router()

router.use(requireAuth, requireAdmin)

router.get('/stats', getStats)

/**
 * Build an absolute URL for a stored upload.
 * Prefers config.appUrl (set via APP_URL env), falls back to the
 * incoming request's host so it still works in dev when APP_URL is unset.
 */
function buildAssetUrl(req: import('express').Request, filename: string): string {
  const base = config.appUrl || `${req.protocol}://${req.get('host')}`
  return `${base}/uploads/${filename}`
}

// Image upload
router.post(
  '/upload-image',
  handleUpload(uploadImage.single('image')),
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No image uploaded' })
      return
    }
    res.status(201).json({
      imageUrl: buildAssetUrl(req, req.file.filename),
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    })
  }
)

// Video upload
router.post(
  '/upload-video',
  handleUpload(uploadVideo.single('video')),
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No video uploaded' })
      return
    }
    res.status(201).json({
      videoUrl: buildAssetUrl(req, req.file.filename),
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    })
  }
)

router.get('/articles', articleHandlers.list)
router.post('/articles', articleHandlers.create)
router.put('/articles/:id', articleHandlers.update)
router.delete('/articles/:id', articleHandlers.remove)

router.get('/podcasts', podcastHandlers.list)
router.post('/podcasts', podcastHandlers.create)
router.put('/podcasts/:id', podcastHandlers.update)
router.delete('/podcasts/:id', podcastHandlers.remove)

router.get('/experts', expertHandlers.list)
router.post('/experts', expertHandlers.create)
router.put('/experts/:id', expertHandlers.update)
router.delete('/experts/:id', expertHandlers.remove)

router.get('/tips', tipHandlers.list)
router.post('/tips', tipHandlers.create)
router.put('/tips/:id', tipHandlers.update)
router.delete('/tips/:id', tipHandlers.remove)

router.get('/likes-analytics', getLikesAnalytics)

export { router as adminRouter }
