import { Router } from 'express'
import * as contentController from '../controllers/content.controller'
import * as mediaController from '../controllers/media.controller'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

router.use(requireAuth)

router.get('/articles', contentController.listArticles)
router.get('/blogs', contentController.listBlogs)
router.get('/blogs/categories', contentController.listBlogCategories)
router.get('/blogs/:slug', contentController.getBlogBySlug)
router.get('/podcasts', contentController.listPodcasts)
router.get('/experts', contentController.listExperts)
router.get('/experts/:id', contentController.getExpertById)
router.get('/experts/:id/articles', contentController.listArticlesByExpert)
router.get('/tips', contentController.listTips)
router.get('/plans', contentController.listPlans)
router.get('/user/stats', contentController.getUserStats)
router.get('/config/features', contentController.getFeatureFlags)
router.get('/media/progress', mediaController.listMediaProgress)
router.get('/media/progress/:mediaId', mediaController.getMediaProgress)
router.put('/media/progress/:mediaId', mediaController.saveMediaProgress)
router.delete('/media/progress/:mediaId', mediaController.clearMediaProgress)

export { router as contentRouter }
