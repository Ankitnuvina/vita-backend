import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
})

const usernameField = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Letters, numbers, underscore, dot, dash only')

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')

export const registerUserSchema = z.object({
  username: usernameField,
  password: passwordField,
})

export const registerAdminSchema = z.object({
  username: usernameField,
  password: passwordField,
  inviteCode: z.string().min(1, 'Invite code is required').max(128),
})

export const articleSchema = z.object({
  cat: z.string().min(1).max(8),
  categoryLabel: z.string().min(1).max(64),
  categoryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(120),
  date: z.string().min(1).max(32),
  readTime: z.string().min(1).max(16),
  imageUrl: z.string().url(),
  excerpt: z.string().min(1).max(500),
  isPremium: z.boolean(),
  slug: z.string().min(1).max(120),
})

export const podcastSchema = z.object({
  episode: z.string().min(1).max(16),
  category: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  guest: z.string().min(1).max(120),
  duration: z.string().min(1).max(16),
  date: z.string().min(1).max(32),
  imageUrl: z.string().url(),
})

export const expertSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  credentials: z.string().min(1).max(200),
  articleCount: z.number().int().min(0).max(10000),
  imageUrl: z.string().url(),
})

export const tipSchema = z.object({
  icon: z.string().min(1).max(8),
  colors: z.object({
    bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    border: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  title: z.string().min(1).max(120),
  text: z.string().min(1).max(500),
})

export type ArticleInput = z.infer<typeof articleSchema>
export type PodcastInput = z.infer<typeof podcastSchema>
export type ExpertInput = z.infer<typeof expertSchema>
export type TipInput = z.infer<typeof tipSchema>
