import mammoth from 'mammoth'

import { extractSections } from './extractSections'

export async function parseDocx(filePath: string) {
  const result = await mammoth.extractRawText({ path: filePath })
  return extractSections(result.value)
}