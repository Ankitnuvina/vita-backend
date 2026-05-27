import { Router } from 'express'
import {
  addComment,
  listComments,
  editComment,
  deleteComment,
  getCommentCount,
  getBatchCommentCount
} from '../controllers/comments.controller'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()


router.post('/batch-comments', getBatchCommentCount)
// No middleware — controller mein req.user check hai
router.get('/:contentType/:contentId', listComments)
router.get('/:contentType/:contentId/count', getCommentCount)

router.post('/:contentType/:contentId', requireAuth, addComment)
router.put('/:commentId', requireAuth, editComment)
router.delete('/:commentId', requireAuth, deleteComment)

export { router as commentsRouter }