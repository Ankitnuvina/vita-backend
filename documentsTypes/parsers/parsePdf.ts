
import fs from 'fs/promises'
import path from 'path'
import { createRequire } from 'module'
import { extractSections } from './extractSections'
import type { SectionItem } from './sectionTypes'


const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

export interface PdfMeta {
  title: string
  authorName: string
  specialist: string
  read: string
  date: string
  cat: string
  sections: { heading: string; items: SectionItem[] }[]
  imageUrl: string
}

export async function parsePdf(filePath: string): Promise<PdfMeta> {
  let imageUrl = ''
  try {
    const { execSync } = await import('child_process')

    const imageDir = path.join(
      process.cwd(),
      'uploads',
      'blogs',
      'images'
    )

    await fs.mkdir(imageDir, { recursive: true })
    const tempDir = path.join(imageDir, `tmp-${Date.now()}`)
    await fs.mkdir(tempDir, { recursive: true })

    try {
      execSync('where pdfimages', {
        stdio: 'ignore',
      })

      execSync(
        `pdfimages -png "${filePath}" "${tempDir}/img"`,
        {
          timeout: 8000,
        }
      )

      const files = await fs.readdir(tempDir)

      const imgFiles = files.filter((f) =>
        /\.(png|jpg|jpeg|ppm)$/i.test(f)
      )

      if (imgFiles.length > 0) {
        const imgName = `${Date.now()}-${Math.round(
          Math.random() * 1e6
        )}.png`

        await fs.rename(
          path.join(tempDir, imgFiles[0]),
          path.join(imageDir, imgName)
        )

        imageUrl = `/uploads/blogs/images/${imgName}`
      }
    } catch {
      imageUrl = ''
    } finally {
      await fs
        .rm(tempDir, {
          recursive: true,
          force: true,
        })
        .catch(() => { })
    }
  } catch {
    imageUrl = ''
  }

  const buffer = await fs.readFile(filePath)
  let rawText = ''
  try {
    const data = await pdfParse(buffer, {
      max: 0,
    })

    rawText = data?.text || ''
  } catch (err) {
    console.error('PDF parse failed:', err)

    throw new Error(
      'Unable to read PDF. File may be scanned, corrupted, or unsupported.'
    )
  }

  const lines = rawText
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean)

  let authorName = 'Vitalize Team'
  let specialist = 'Health Writer'
  let read = '5 min'
  let date = new Date().toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })
  let cat = 'General'

  let metaEndIndex = 0

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i]

    const authorMatch = line.match(
      /Author\s*Name\s*:\s*(.+)/i
    )

    if (authorMatch) {
      authorName = authorMatch[1].trim()
    }

    const specialistMatch = line.match(
      /Specialist\s*:\s*(.+)/i
    )

    if (specialistMatch) {
      specialist = specialistMatch[1].trim()
    }

    const readMatch = line.match(
      /Read\s*Time\s*:\s*(.+)/i
    )

    if (readMatch) {
      read = readMatch[1].trim()
    }

    const dateMatch = line.match(
      /Published\s*Date\s*:\s*(.+)/i
    )

    if (dateMatch) {
      date = dateMatch[1].trim()
    }

    const catMatch = line.match(
      /Category\s*:\s*(.+)/i
    )

    if (catMatch) {
      cat = catMatch[1].trim()
    }

    if (
      /Author\s*Name\s*:/i.test(line) ||
      /Published\s*Date\s*:/i.test(line)
    ) {
      metaEndIndex = i + 1
    }
  }

  const contentText = lines
    .slice(metaEndIndex)
    .join('\n')

  const { title, sections } =
    extractSections(contentText)

  return {
    title,
    authorName,
    specialist,
    read,
    date,
    cat,
    sections,
    imageUrl,
  }
}