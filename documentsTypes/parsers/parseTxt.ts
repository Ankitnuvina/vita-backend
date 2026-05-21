import fs from 'fs/promises'

import { extractSections } from './extractSections'
export async function parseTxt(filePath: string) {
  const text = await fs.readFile(filePath, 'utf-8')
  return extractSections(text)
}