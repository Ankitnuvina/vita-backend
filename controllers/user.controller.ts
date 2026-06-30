import type { RequestHandler } from 'express'
import { userRepo } from '../data/store'
import { logger } from '../logger'
import { config } from '../config'
import { updateProfileSchema } from '../schemas'
import { ZodError } from 'zod'

export const getProfile: RequestHandler = async (req, res, next) => {
  try {
    const user = await userRepo.findByUserId(req.user!.userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    const { passwordHash, verificationToken, verificationTokenExpiry, ...safe } = user
    res.json(safe)
  } catch (err) {
    next(err)
  }
}

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    const { username, email } = updateProfileSchema.parse(req.body)

    if (username) {
      const existing = await userRepo.findByUsername(username)
      if (existing && existing.userId !== req.user!.userId) {
        res.status(409).json({ error: 'Username is already taken' })
        return
      }
    }

    if (email) {
      const existing = await userRepo.findByEmail(email)
      if (existing && existing.userId !== req.user!.userId) {
        res.status(409).json({ error: 'Email is already registered' })
        return
      }
    }

    const updated = await userRepo.updateProfile(req.user!.userId, { username, email })
    if (!updated) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { passwordHash, verificationToken, verificationTokenExpiry, ...safe } = updated
    logger.info(`[UserController] Profile updated for userId: ${req.user!.userId}`)
    res.json(safe)
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.issues })
      return
    }
    next(err)
  }
}

export const uploadAvatarHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image uploaded' })
      return
    }
    const avatarUrl = `${config.appUrl}/uploads/avatars/${req.file.filename}`
    await userRepo.updateAvatar(req.user!.userId, avatarUrl)
    logger.info(`[UserController] Avatar updated for userId: ${req.user!.userId}`)
    res.json({ avatarUrl })
  } catch (err) {
    next(err)
  }
}

export const deleteAccount: RequestHandler = async (req, res, next) => {
  try {
    await userRepo.softDelete(req.user!.userId)
    logger.info(`[UserController] Account soft-deleted for userId: ${req.user!.userId}`)
    res.json({ message: 'Account deactivated successfully.' })
  } catch (err) {
    next(err)
  }
}