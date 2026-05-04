import { Router } from 'express'
import {
  articleHandlers,
  expertHandlers,
  getStats,
  podcastHandlers,
  tipHandlers,
} from '../controllers/admin.controller'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

router.use(requireAuth, requireAdmin)

router.get('/stats', getStats)

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

export { router as adminRouter }
