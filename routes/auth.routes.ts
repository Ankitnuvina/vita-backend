import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as authController from '../controllers/auth.controller'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a minute.' },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again in a minute.' },
})

const adminAuthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin auth attempts. Please try again in a minute.' },
})

router.post('/login', loginLimiter, authController.login)
router.post('/register', registerLimiter, authController.register)

router.post('/admin/login', adminAuthLimiter, authController.adminLogin)
router.post('/admin/register', adminAuthLimiter, authController.registerAdmin)

router.post('/logout', authController.logout)
router.post('/refresh', authController.refresh)
router.get('/me', requireAuth, authController.me)

export { router as authRouter }
