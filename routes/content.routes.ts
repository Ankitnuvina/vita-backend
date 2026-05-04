import { Router } from 'express'
import * as contentController from '../controllers/content.controller'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

router.use(requireAuth)

router.get('/articles', contentController.listArticles)
router.get('/podcasts', contentController.listPodcasts)
router.get('/experts', contentController.listExperts)
router.get('/tips', contentController.listTips)
router.get('/plans', contentController.listPlans)
router.get('/user/stats', contentController.getUserStats)
router.get('/config/features', contentController.getFeatureFlags)

export { router as contentRouter }
