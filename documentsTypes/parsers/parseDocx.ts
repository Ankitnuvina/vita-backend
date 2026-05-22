import mammoth from 'mammoth'
import { extractSections } from './extractSections'
import fs from 'fs/promises'
import path from 'path'

export interface DocxMeta {
  title: string
  imageUrl: string
  authorName: string
  specialist: string
  read: string
  date: string
  cat: string
  sections: { heading: string; items: string[] }[]
}

export async function parseDocx(filePath: string): Promise<DocxMeta> {
  let imageUrl = ''
  try {
    const imageDir = path.join(process.cwd(), 'uploads', 'blogs', 'images')
    await fs.mkdir(imageDir, { recursive: true })

    const imageResults: string[] = []

    await mammoth.convertToHtml(
      { path: filePath },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          if (imageResults.length === 0) {
            const ext = image.contentType.split('/')[1] || 'png'
            const imgName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
            const imgPath = path.join(imageDir, imgName)
            const buffer = await image.read()
            await fs.writeFile(imgPath, buffer)
            imageResults.push(`/uploads/blogs/images/${imgName}`)
          }
          return { src: '' }
        }),
      }
    )

    if (imageResults.length > 0) {
      imageUrl = imageResults[0]
    }
  } catch {
  }

  const result = await mammoth.extractRawText({ path: filePath })
  const rawText = result.value
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

  let authorName = 'Vitalize Team'
  let specialist = 'Health Writer'
  let read = '5 min'
  let date = new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  let cat = 'General'
  let metaEndIndex = 0

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i]

    const authorMatch = line.match(/Author\s*Name\s*:\s*([^:]+?)(?:\s{2,}|Specialist|$)/i)
    if (authorMatch) authorName = authorMatch[1].trim()

    const specialistMatch = line.match(/Specialist\s*:\s*([^:]+?)(?:\s{2,}|Read\s*Time|$)/i)
    if (specialistMatch) specialist = specialistMatch[1].trim()

    const readMatch = line.match(/Read\s*Time\s*:\s*([^:]+?)(?:\s{2,}|$)/i)
    if (readMatch) read = readMatch[1].trim()

    const dateMatch = line.match(/Published\s*Date\s*:\s*([^:]+?)(?:\s{2,}|Category|$)/i)
    if (dateMatch) date = dateMatch[1].trim()

    const catMatch = line.match(/Category\s*:\s*([^:]+?)(?:\s{2,}|$)/i)
    if (catMatch) cat = catMatch[1].trim()

    if (
      line.match(/Author\s*Name\s*:/i) ||
      line.match(/Published\s*Date\s*:/i)
    ) {
      metaEndIndex = i + 1
    }
  }

  const contentLines = lines.slice(metaEndIndex)
  const contentText = contentLines.join('\n')
  const { title, sections } = extractSections(contentText)

  return { title, authorName, specialist, read, date, cat, sections, imageUrl }
}