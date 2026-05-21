// src/parsers/extractSections.ts — shared helper
export function extractSections(rawText: string) {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  // Pehli line title hogi
  const title = lines[0] || 'Untitled Blog'

  const sections: { heading: string; items: string[] }[] = []
  let currentHeading = 'Overview'
  let currentItems: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]

    // Heading detect karo — short lines (under 80 chars) jo sentence nahi hain
    const isHeading =
      line.length < 80 &&
      !line.endsWith('.') &&
      !line.endsWith(',') &&
      line === line.replace(/[.,:;]$/, '') &&
      (line.startsWith('#') || /^[A-Z]/.test(line) || /^\d+\./.test(line))

    if (isHeading) {
      if (currentItems.length > 0) {
        sections.push({ heading: currentHeading, items: currentItems })
      }
      currentHeading = line.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '')
      currentItems = []
    } else if (line.length > 20) {
      currentItems.push(line)
    }
  }

  // Last section push karo
  if (currentItems.length > 0) {
    sections.push({ heading: currentHeading, items: currentItems })
  }

  // Agar koi section nahi mila
  if (sections.length === 0) {
    sections.push({ heading: 'Content', items: lines.slice(1, 20) })
  }

  return { title, sections }
}