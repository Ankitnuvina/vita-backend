export function extractSections(rawText: string) {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const isMetaLine = (line: string) => /^(Author|Specialist|Read\s*Time|Published|Category)\s*:/i.test(line) || /📅|⏱|✍️|🔄/.test(line)

  let title = 'Untitled Blog'
  let titleIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!isMetaLine(line) && line.length >= 10 && !line.startsWith('⚡') && !line.startsWith('🩺')) {
      title = line.replace(/^#+\s*/, '').trim()
      titleIndex = i
      break
    }
  }

  const sections: { heading: string; items: string[] }[] = []
  let currentHeading = 'Overview'
  let currentItems: string[] = []

  for (let i = titleIndex + 1; i < lines.length; i++) {
    const line = lines[i]

    if (isMetaLine(line)) continue

    const isHeading =
      line.length < 90 &&
      !line.endsWith('.') &&
      !line.endsWith(',') &&
      (line.startsWith('#') || /^[A-Z]/.test(line) || /^\d+[\.\)]/.test(line)) &&
      !line.includes(':')

    if (isHeading) {
      if (currentItems.length > 0) {
        sections.push({ heading: currentHeading, items: currentItems })
      }
      currentHeading = line.replace(/^#+\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim()
      currentItems = []
    } else if (line.length > 15) {
      currentItems.push(line)
    }
  }

  if (currentItems.length > 0) {
    sections.push({ heading: currentHeading, items: currentItems })
  }

  if (sections.length === 0) {
    sections.push({ heading: 'Content', items: lines.slice(titleIndex + 1, titleIndex + 20) })
  }

  return { title, sections }
}