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

import { uploadImage, uploadVideo } from '@/middleware/upload'


const router = Router()

router.use(requireAuth, requireAdmin)

router.get('/stats', getStats)


// Image upload
router.post(
  '/upload-image',
  uploadImage.single('image'),   // ← uploadImage
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No image uploaded' })
      return
    }
    const imageUrl = `${process.env.APP_URL}/uploads/${req.file.filename}`
    res.status(201).json({ imageUrl })
  }
)

// Video upload
router.post(
  '/upload-video',
  uploadVideo.single('video'),   // ← uploadVideo
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No video uploaded' })
      return
    }
    const videoUrl = `${process.env.APP_URL}/uploads/${req.file.filename}`
    res.status(201).json({ videoUrl })
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
