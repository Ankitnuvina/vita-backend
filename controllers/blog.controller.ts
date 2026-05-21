import type { RequestHandler } from 'express'
import fs from 'fs/promises'
import { parsePdf } from '@/documentsTypes/parsers/parsePdf'
import { parseDocx } from '@/documentsTypes/parsers/parseDocx'
import { parseTxt } from '@/documentsTypes/parsers/parseTxt'
import { parseXlsx } from '@/documentsTypes/parsers/parseXlsx'
import { blogRepo } from '@/data/store'
import { logger } from '../logger'
// import path from 'path'


// GET /api/blogs
export const listBlogs: RequestHandler = async (_req, res, next) => {
    try {
        const blogs = await blogRepo.list()
        res.json(blogs)
    } catch (err) {
        next(err)
    }
}

// GET /api/blogs/:id
export const getBlogById: RequestHandler = async (req, res, next) => {
    try {
        const blog = await blogRepo.byId(Number(req.params.id))
        if (!blog) {
            res.status(404).json({ error: 'Blog not found' })
            return
        }
        res.json(blog)
    } catch (err) {
        next(err)
    }
}

// POST /api/blogs/upload
export const uploadBlog: RequestHandler = async (req, res, next) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' })
        return
    }

    const filePath = req.file.path
    const mimeType = req.file.mimetype

    try {
        let parsed: { title: string; sections: { heading: string; items: string[] }[] }

        if (mimeType === 'application/pdf') {
            parsed = await parsePdf(filePath)
        } else if (mimeType.includes('wordprocessingml')) {
            parsed = await parseDocx(filePath)
        } else if (mimeType.includes('spreadsheetml')) {
            parsed = await parseXlsx(filePath)
        } else {
            parsed = await parseTxt(filePath)
        }

        // 2. Blog object banao
        const blog = await blogRepo.create({
            title: parsed.title || req.file.originalname,
            desc: parsed.sections[0]?.items[0]?.slice(0, 200) || '',
            cat: (req.body.cat as string) || 'General',
            read: `${Math.max(1, Math.ceil(parsed.sections.length * 1.5))} min`,
            date: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
            featured: false,
            color: '#E1F5EE',
            textColor: '#0F6E56',
            authorName: (req.body.authorName as string) || 'Vitalize Team',
            specialist: (req.body.specialist as string) || 'Health Writer',
            imageUrl: (req.body.imageUrl as string) || '',
            sections: parsed.sections,
        })

        // 3. Uploaded file delete karo (data DB mein save ho gayi)
        await fs.unlink(filePath).catch(() => { })

        logger.info(`[BlogController] Blog created from upload: id=${blog.id}`)
        res.status(201).json(blog)
    } catch (err) {
        await fs.unlink(filePath).catch(() => { })
        next(err)
    }
}