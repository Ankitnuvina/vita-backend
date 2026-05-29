import { Router } from 'express'
import { articleHandlers, expertHandlers, getStats, podcastHandlers, tipHandlers, getLikesAnalytics} from '../controllers/admin.controller'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireAuth } from '../middleware/requireAuth'
import { handleUpload, uploadImage, uploadVideo } from '@/middleware/upload'
import { config } from '../config'

const router = Router()
router.use(requireAuth, requireAdmin)
router.get('/stats', getStats)

function buildAssetUrl(req: import('express').Request, filename: string, type: 'image' | 'video'): string {
  const base = config.appUrl || `${req.protocol}://${req.get('host')}`
  const subfolder = type === 'image' ? 'uploadsArticlesImages' : 'uploadsPodcastsVideos'
  return `${base}/uploads/${subfolder}/${filename}`
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
      imageUrl: buildAssetUrl(req, req.file.filename, 'image'),
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
      videoUrl: buildAssetUrl(req, req.file.filename, 'video'),
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
