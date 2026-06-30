import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { handleUpload, uploadAvatar } from '../middleware/upload'
import * as userController from '../controllers/user.controller'

const router = Router()

router.use(requireAuth)

router.get('/profile', userController.getProfile)
router.patch('/profile', userController.updateProfile)
router.post(
  '/avatar',
  handleUpload(uploadAvatar.single('avatar')),
  userController.uploadAvatarHandler
)
router.delete('/account', userController.deleteAccount)

export { router as userRouter }