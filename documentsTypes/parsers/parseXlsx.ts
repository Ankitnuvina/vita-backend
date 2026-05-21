import * as XLSX from 'xlsx'
import { extractSections } from './extractSections'


export async function parseXlsx(filePath: string) {
  const workbook = XLSX.readFile(filePath)
  let fullText = ''

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    fullText += `\n${sheetName}\n`
    fullText += XLSX.utils.sheet_to_csv(sheet)
  })

  return extractSections(fullText)
}