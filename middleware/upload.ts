import type { NextFunction, Request, RequestHandler, Response } from 'express'
import multer, { MulterError } from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads')
const IMAGE_DIR = path.join(UPLOAD_ROOT, 'uploadsArticlesImages')
const VIDEO_DIR = path.join(UPLOAD_ROOT, 'uploadsPodcastsVideos')

for (const dir of [UPLOAD_ROOT, IMAGE_DIR, VIDEO_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMAGE_DIR),
  filename: (_req, file, cb) => cb(null, buildFilename(file.originalname)),
})

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEO_DIR),
  filename: (_req, file, cb) => cb(null, buildFilename(file.originalname)),
})

const generalStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => cb(null, buildFilename(file.originalname)),
})


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

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export const upload = multer({
  storage: generalStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [...IMAGE_TYPES, ...VIDEO_TYPES]
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error(`File type not allowed: ${file.mimetype}`))
  },
})

export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    IMAGE_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new Error(`Only image files allowed`))
  },
})

export const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    VIDEO_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new Error(`Only video files allowed`))
  },
})


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
