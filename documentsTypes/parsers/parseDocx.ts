import mammoth from 'mammoth'
import fs from 'fs/promises'
import path from 'path'
import type { SectionItem, BlogSection } from './sectionTypes'

export interface DocxMeta {
  title: string
  imageUrl: string
  authorName: string
  specialist: string
  read: string
  date: string
  cat: string
  sections: BlogSection[]
}

// ── HTML helpers ────────────────────────────────────────────────────────────

function decodeHtml(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function stripTags(s: string): string {
  return decodeHtml(s.replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim()
}

function brToNewline(s: string): string {
  return s.replace(/<br\s*\/?>/gi, '\n')
}

// ── Block tokenizer ─────────────────────────────────────────────────────────
// Mammoth produces flat top-level blocks (h1..h6, p, ul, ol, table).
// They never nest into each other (except inside table cells / list items),
// so a non-greedy regex match per tag works reliably.

type BlockTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'ul' | 'ol' | 'table'

interface Block {
  tag: BlockTag
  inner: string
  raw: string
}

function tokenize(html: string): Block[] {
  const out: Block[] = []
  const re = /<(h[1-6]|p|ul|ol|table)\b[^>]*>([\s\S]*?)<\/\1>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    out.push({ tag: m[1] as BlockTag, inner: m[2], raw: m[0] })
  }
  return out
}

// ── Image extraction ────────────────────────────────────────────────────────
// Each image is saved to disk and replaced in the HTML with a placeholder
// `__IMAGE_<idx>__` that we can match later when slicing per blog.

async function convertToHtmlWithImages(filePath: string): Promise<{
  html: string
  imageUrls: string[]
}> {
  const imageDir = path.join(process.cwd(), 'uploads', 'blogs', 'images')
  await fs.mkdir(imageDir, { recursive: true })

  const imageUrls: string[] = []

  const result = await mammoth.convertToHtml(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const ext = (image.contentType.split('/')[1] || 'png').replace('jpeg', 'jpg')
        const imgName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`
        const imgPath = path.join(imageDir, imgName)
        const buffer = await image.read()
        await fs.writeFile(imgPath, buffer)
        const url = `/uploads/blogs/images/${imgName}`
        const idx = imageUrls.length
        imageUrls.push(url)
        return { src: `__IMAGE_${idx}__` }
      }),
    }
  )

  return { html: result.value, imageUrls }
}

// ── Meta block parsing ──────────────────────────────────────────────────────

const META_KEYWORDS = [
  'Author\\s*Name',
  'Specialist',
  'Read\\s*Time',
  'Published\\s*Date',
  'Category',
]

function isAuthorParagraph(text: string): boolean {
  return /Author\s*Name\s*:/i.test(text)
}

function looksLikeMetaBlock(text: string): boolean {
  return META_KEYWORDS.some((f) => new RegExp(`${f}\\s*:`, 'i').test(text))
}

/**
 * The meta block can either come as separate <p>'s OR all inside one <p>
 * with the fields separated by <br /> (newlines) OR even concatenated on
 * a single line (e.g. "Author Name : SophiaRead Time : 15 min...").
 *
 * We normalise by inserting a sentinel before each known keyword so that
 * a split-and-trim cleanly yields one field per segment.
 */
function parseMetaText(text: string, meta: Partial<DocxMeta>): void {
  let normalized = text
  for (const f of META_KEYWORDS) {
    normalized = normalized.replace(
      new RegExp(`(\\s*)(${f}\\s*:)`, 'gi'),
      '\u0001$2'
    )
  }

  const segments = normalized
    .split('\u0001')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  for (const seg of segments) {
    const m = seg.match(/^([A-Za-z][A-Za-z\s]*?)\s*:\s*(.+)$/)
    if (!m) continue
    const key = m[1].trim().toLowerCase().replace(/\s+/g, '')
    const value = m[2].trim()
    if (!value) continue
    if (key === 'authorname') meta.authorName = value
    else if (key === 'specialist') meta.specialist = value
    else if (key === 'readtime') meta.read = value
    else if (key === 'publisheddate') meta.date = value
    else if (key === 'category') meta.cat = value
  }
}

// ── List / table parsers ────────────────────────────────────────────────────

function parseList(inner: string): SectionItem[] {
  const items: SectionItem[] = []
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(inner)) !== null) {
    const text = stripTags(brToNewline(m[1])).replace(/\s*\n\s*/g, ' ').trim()
    if (text) items.push({ type: 'bullet', text })
  }
  return items
}

function parseTable(inner: string): SectionItem | null {
  const cleaned = inner.replace(
    /<thead\b[^>]*>|<\/thead>|<tbody\b[^>]*>|<\/tbody>/gi,
    ''
  )
  const rows: string[][] = []
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/g
  let r: RegExpExecArray | null
  while ((r = rowRe.exec(cleaned)) !== null) {
    const cellRe = /<(t[dh])\b[^>]*>([\s\S]*?)<\/\1>/gi
    const cells: string[] = []
    let c: RegExpExecArray | null
    while ((c = cellRe.exec(r[1])) !== null) {
      cells.push(stripTags(brToNewline(c[2])).replace(/\s*\n\s*/g, ' ').trim())
    }
    if (cells.length > 0) rows.push(cells)
  }
  if (rows.length === 0) return null
  return { type: 'table', headers: rows[0], rows: rows.slice(1) }
}

// ── Build a single blog from its block range ────────────────────────────────

function buildBlog(blocks: Block[], imageUrls: string[]): DocxMeta {
  const meta: Partial<DocxMeta> = {}
  const sections: BlogSection[] = []
  let title = ''
  let imageUrl = ''

  let currentHeading = ''
  let currentItems: SectionItem[] = []
  let hasFlushedAtLeastOnce = false

  const flush = () => {
    if (currentItems.length > 0) {
      sections.push({
        heading: currentHeading || 'Overview',
        items: currentItems,
      })
      hasFlushedAtLeastOnce = true
    }
    currentItems = []
  }

  const resolveFirstImage = (raw: string): string | null => {
    const m = raw.match(/__IMAGE_(\d+)__/)
    if (!m) return null
    return imageUrls[Number(m[1])] ?? null
  }

  for (const block of blocks) {
    // Capture blog's cover image from the first image placeholder we see
    if (!imageUrl) {
      const img = resolveFirstImage(block.raw)
      if (img) imageUrl = img
    }

    if (block.tag === 'p') {
      const text = stripTags(brToNewline(block.inner))

      // Meta block (handles all variants — one <p> per field OR all in one)
      if (looksLikeMetaBlock(text)) {
        parseMetaText(text, meta)
        continue
      }

      // Image-only paragraph → nothing to add as content
      if (!text) continue

      currentItems.push({ type: 'paragraph', text })
      continue
    }

    if (/^h[1-6]$/.test(block.tag)) {
      const level = Number(block.tag.slice(1))
      const headingText = stripTags(brToNewline(block.inner))
      if (!headingText) continue

      // h1 / h2 → new top-level section.
      // Also serves as the blog title (first encountered heading wins).
      if (level <= 2) {
        if (!title) title = headingText
        flush()
        currentHeading = headingText
      } else {
        // h3+ → sub-heading inside the current section
        currentItems.push({
          type: 'heading',
          level: Math.min(6, level) as 2 | 3 | 4 | 5 | 6,
          text: headingText,
        })
      }
      continue
    }

    if (block.tag === 'ul' || block.tag === 'ol') {
      const items = parseList(block.inner)
      currentItems.push(...items)
      continue
    }

    if (block.tag === 'table') {
      const t = parseTable(block.inner)
      if (t) currentItems.push(t)
      continue
    }
  }

  flush()

  // Edge case: no headings at all but we still have items → make one Overview
  if (!hasFlushedAtLeastOnce && sections.length === 0 && currentItems.length === 0) {
    sections.push({ heading: 'Overview', items: [] })
  }

  return {
    title: title || 'Untitled Blog',
    imageUrl,
    authorName: meta.authorName ?? 'Vitalize Team',
    specialist: meta.specialist ?? 'Health Writer',
    read: meta.read ?? '5 min',
    date:
      meta.date ??
      new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    cat: meta.cat ?? 'General',
    sections,
  }
}

// ── Boundary detection ──────────────────────────────────────────────────────
// A new blog starts at every paragraph that contains "Author Name :".
// We also pull the immediately preceding image-only paragraph(s) into the
// next blog so that each blog keeps its own cover image.

function findBlogStarts(blocks: Block[]): number[] {
  const boundaries: number[] = []
  blocks.forEach((b, idx) => {
    if (b.tag !== 'p') return
    const text = stripTags(brToNewline(b.inner))
    if (isAuthorParagraph(text)) boundaries.push(idx)
  })

  if (boundaries.length === 0) return []

  const starts: number[] = []
  boundaries.forEach((boundary, i) => {
    if (i === 0) {
      starts.push(0)
      return
    }
    let s = boundary
    const prevEnd = boundaries[i - 1]
    let j = s - 1
    while (j > prevEnd) {
      const blk = blocks[j]
      if (blk.tag === 'p') {
        const text = stripTags(brToNewline(blk.inner))
        const hasImg = /<img\b/.test(blk.raw)
        if (hasImg && !text) {
          s = j
          j--
          continue
        }
      }
      break
    }
    starts.push(s)
  })

  return starts
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Parse a .docx file that may contain ONE or MULTIPLE blog posts.
 * Each blog is separated by a paragraph beginning "Author Name : ...".
 * Each blog can carry its own cover image and preserves the document's
 * heading / paragraph / bullet / table structure.
 */
export async function parseDocx(filePath: string): Promise<DocxMeta[]> {
  const { html, imageUrls } = await convertToHtmlWithImages(filePath)
  const blocks = tokenize(html)

  if (blocks.length === 0) return []

  const starts = findBlogStarts(blocks)

  // Single blog (no explicit author boundary found)
  if (starts.length === 0) {
    return [buildBlog(blocks, imageUrls)]
  }

  const blogs: DocxMeta[] = []
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i]
    const to = i + 1 < starts.length ? starts[i + 1] : blocks.length
    blogs.push(buildBlog(blocks.slice(from, to), imageUrls))
  }

  return blogs
}
