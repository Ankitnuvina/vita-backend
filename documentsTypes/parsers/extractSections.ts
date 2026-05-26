import type { SectionItem, BlogSection } from './sectionTypes'

export type { SectionItem, BlogSection }

function isMetaLine(line: string): boolean {
  return (
    /^(Author|Specialist|Read\s*Time|Published|Category)\s*:/i.test(line) ||
    /^[📅⏱✍️🔄]/.test(line)
  )
}

function isHeading(line: string): boolean {
  if (line.startsWith('|')) return false
  if (/^[-•*]\s/.test(line)) return false
  if (line.endsWith('.') || line.endsWith(',') || line.endsWith(':')) return false
  if (line.length > 100) return false
  if (/^\d+[\.\)]\s+\S/.test(line)) return true
  if (line.startsWith('#')) return true
  if (line.length < 80 && /^[A-Z\d]/.test(line)) return true
  return false
}

function cleanText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^[-•*]\s+/, '')
    .trim()
}

function parseTable(tableLines: string[]): SectionItem {
  const dataLines = tableLines.filter(
    (l) => !/^\|\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?$/.test(l)
  )

  const parseRow = (line: string): string[] =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cleanText(cell))

  const [headerLine, ...rowLines] = dataLines
  const headers = parseRow(headerLine ?? '')
  const rows = rowLines.map(parseRow)

  return { type: 'table', headers, rows }
}

export function extractSections(rawText: string): {
  title: string
  sections: BlogSection[]
} {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  let title = 'Untitled Blog'
  let titleIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!isMetaLine(line) && line.length >= 8 && !line.startsWith('⚡') && !line.startsWith('🩺')) {
      title = cleanText(line.replace(/^#+\s*/, ''))
      titleIndex = i
      break
    }
  }

  const sections: BlogSection[] = []
  let currentHeading = 'Overview'
  let currentItems: SectionItem[] = []

  const flush = () => {
    if (currentItems.length > 0) {
      sections.push({ heading: currentHeading, items: currentItems })
    }
    currentItems = []
  }

  let i = titleIndex + 1
  while (i < lines.length) {
    const line = lines[i]

    if (isMetaLine(line)) { i++; continue }

    if (line.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      if (tableLines.length >= 2) {
        currentItems.push(parseTable(tableLines))
      }
      continue
    }

    if (isHeading(line) && line !== title) {
      flush()
      currentHeading = cleanText(line.replace(/^#+\s*/, '').replace(/^\d+[\.\)]\s*/, ''))
      i++
      continue
    }

    if (/^[-•*]\s/.test(line)) {
      currentItems.push({ type: 'bullet', text: cleanText(line) })
      i++
      continue
    }

    if (line.length >= 10) {
      const next = lines[i + 1] ?? ''
      if (/^Examples?\s*:/i.test(next)) {
        const merged = `${cleanText(line)} — e.g. ${cleanText(next.replace(/^Examples?\s*:\s*/i, ''))}`
        currentItems.push({ type: 'paragraph', text: merged })
        i += 2
        continue
      }
      currentItems.push({ type: 'paragraph', text: cleanText(line) })
    }

    i++
  }

  flush()

  if (sections.length === 0) {
    const fallback: SectionItem[] = lines
      .slice(titleIndex + 1, titleIndex + 20)
      .map((l) => ({ type: 'paragraph' as const, text: cleanText(l) }))
    sections.push({ heading: 'Content', items: fallback })
  }

  return { title, sections }
}