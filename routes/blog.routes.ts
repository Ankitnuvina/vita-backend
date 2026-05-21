import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import * as blogController from '../controllers/blog.controller'
import { handleUpload } from '../middleware/upload'

const uploadDir = path.join(process.cwd(), 'uploads/blogs')
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir)
    },
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
        cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`)
    },
})

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ]
        if (allowed.includes(file.mimetype)) cb(null, true)
        else cb(new Error('Only PDF, DOCX, XLSX, TXT files allowed'))
    },
})

const router = Router()

router.get('/blogs', blogController.listBlogs)
router.get('/blogs/:id', blogController.getBlogById)
router.post(
    '/blogs/upload',
    handleUpload(upload.single('document')),
    blogController.uploadBlog,
)

export { router as blogRouter }
