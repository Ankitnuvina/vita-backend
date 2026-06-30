import type { RequestHandler } from 'express'
import { chatRepo } from '../data/store'
import { AI_SYSTEM_PROMPT } from '@/data/welnessPrompts/vitaAI.prompt'

const OPENAI_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export const chat: RequestHandler = async (req, res, next) => {
  try {
    const { messages, max_tokens, temperature, sessionId } = req.body as {
      messages: { role: string; content: string }[]
      max_tokens?: number
      temperature?: number
      sessionId?: string
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages array required' })
      return
    }
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const safeMessages = [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      ...messages
        .filter((m) => m.role !== 'system')
        .slice(-10),
    ]

    const openaiRes = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'HTTP-Referer':  `${process.env.CORS_ORIGIN}`,
        'X-Title': 'Vitalize Health',
      },
      
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: safeMessages,
        max_tokens: Math.min(max_tokens ?? 300, 400),
        temperature: temperature ?? 0.5,
      }),
    })

  if (!openaiRes.ok) {
  const errText = await openaiRes.text()
  res.status(openaiRes.status).json({
    error: errText,
  })
  return
}

    const data: any = await openaiRes.json()

    const latestQuestion =
      [...messages]
        .reverse()
        .find((m) => m.role === 'user' && typeof m.content === 'string')
        ?.content ?? ''
    const aiAnswer =
      typeof data?.choices?.[0]?.message?.content === 'string'
        ? data.choices[0].message.content
        : ''

    if (latestQuestion.trim() && aiAnswer.trim()) {
      await chatRepo.add(req.user.userId, sessionId ?? 'default', latestQuestion, aiAnswer)
    }

    res.json(data)
  } catch (err) {
    next(err)
  }
}


export const getChatHistory: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const history = await chatRepo.getAll(req.user.userId)
    res.json(history)
  } catch (err) {
    next(err)
  }
}

export const renameSession: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const { sessionId } = req.params
    const { title } = req.body as { title?: string }
    if (!title?.trim()) {
      res.status(400).json({ error: 'title required' })
      return
    }
    await chatRepo.renameSession(req.user.userId, sessionId, title)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

export const deleteSession: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const { sessionId } = req.params
    await chatRepo.deleteSession(req.user.userId, sessionId)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}




export const pinSession: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const { sessionId } = req.params
    const { pin } = req.body as { pin: boolean }
    await chatRepo.pinSession(req.user.userId, sessionId, pin)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}