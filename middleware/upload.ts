import type { NextFunction, Request, RequestHandler, Response } from 'express'
import multer, { MulterError } from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const uploadPath = path.join(process.cwd(), 'uploads')

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true })
}

/**
 * Build a safe, collision-resistant file name:
 *   <timestamp>-<random>-<sanitized-original>.<ext>
 *
 * - strips path separators / weird chars
 * - keeps the original extension lowercased
 * - hard-caps the base name length so we never blow past Windows / fs limits
 */
function buildFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'file'
  const rand = crypto.randomBytes(4).toString('hex')
  return `${Date.now()}-${rand}-${base}${ext}`
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadPath)
  },
  filename: (_req, file, cb) => {
    cb(null, buildFilename(file.originalname))
  },
})

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [...IMAGE_TYPES, ...VIDEO_TYPES]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`))
    }
  },
})

export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Only image files allowed (${IMAGE_TYPES.join(', ')})`))
    }
  },
})

export const uploadVideo = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
  fileFilter: (_req, file, cb) => {
    if (VIDEO_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Only video files allowed (${VIDEO_TYPES.join(', ')})`))
    }
  },
})

/**
 * Wrap a multer middleware so that multer / fileFilter errors are converted
 * to a clean JSON 400 response instead of bubbling up to the global error
 * handler as a generic 500.
 *
 *   router.post('/upload-image',
 *     handleUpload(uploadImage.single('image')),
 *     (req, res) => { ... })
 */
export function handleUpload(mw: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    mw(req, res, (err: unknown) => {
      if (!err) {
        next()
        return
      }
      if (err instanceof MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large'
            : err.code === 'LIMIT_UNEXPECTED_FILE'
              ? `Unexpected field "${err.field}"`
              : err.message
        res.status(400).json({ error: message, code: err.code })
        return
      }
      if (err instanceof Error) {
        res.status(400).json({ error: err.message })
        return
      }
      next(err)
    })
  }
}
