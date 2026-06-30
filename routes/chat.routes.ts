import { Router } from 'express'
import { chat , deleteSession, getChatHistory, pinSession, renameSession} from '../controllers/chat.controller'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

router.post('/', requireAuth, chat)

router.get('/history', requireAuth, getChatHistory)

router.patch('/:sessionId/rename', requireAuth, renameSession)
router.delete('/:sessionId', requireAuth, deleteSession)

router.patch('/:sessionId/pin', requireAuth, pinSession)

export { router as chatRouter }