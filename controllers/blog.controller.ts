import type { RequestHandler } from 'express'
import fs from 'fs/promises'
import { parsePdf } from '@/documentsTypes/parsers/parsePdf'
import { parseDocx } from '@/documentsTypes/parsers/parseDocx'
import { parseTxt } from '@/documentsTypes/parsers/parseTxt'
import { parseXlsx } from '@/documentsTypes/parsers/parseXlsx'
import { blogRepo } from '@/data/store'
import { logger } from '../logger'


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
        let parsed: {
            title: string
            sections: { heading: string; items: string[] }[]
            authorName?: string
            specialist?: string
            read?: string
            date?: string
            cat?: string
            imageUrl?: string
        }

        if (mimeType === 'application/pdf') {
            parsed = await parsePdf(filePath)
        } else if (mimeType.includes('wordprocessingml')) {
            parsed = await parseDocx(filePath)
        } else if (mimeType.includes('spreadsheetml')) {
            parsed = await parseXlsx(filePath)
        } else {
            parsed = await parseTxt(filePath)
        }

        const blog = await blogRepo.create({
            title: parsed.title || req.file.originalname,
            desc: parsed.sections[0]?.items[0]?.slice(0, 200) || '',
            cat: parsed.cat || (req.body.cat as string) || 'General',
            read: parsed.read || (req.body.read as string) || '5 min',
            date: parsed.date || (req.body.date as string) || new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
            authorName: parsed.authorName || (req.body.authorName as string) || 'Vitalize Team',
            specialist: parsed.specialist || (req.body.specialist as string) || 'Health Writer',
            imageUrl: parsed.imageUrl || (req.body.imageUrl as string) || '',
            featured: false,
            color: '#E1F5EE',
            textColor: '#0F6E56',
            sections: parsed.sections,
        })

        await fs.unlink(filePath).catch(() => { })
        logger.info(`[BlogController] Blog created: id=${blog.id}, author=${blog.authorName}`)
        res.status(201).json(blog)

    } catch (err) {
        await fs.unlink(filePath).catch(() => { })
        next(err)
    }
}