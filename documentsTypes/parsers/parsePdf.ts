// src/parsers/parsePdf.ts
import fs from 'fs/promises'
import { createRequire } from 'module'
import { extractSections } from './extractSections'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>

export async function parsePdf(filePath: string) {
  const buffer = await fs.readFile(filePath)
  const data = await pdfParse(buffer)
  return extractSections(data.text)
}