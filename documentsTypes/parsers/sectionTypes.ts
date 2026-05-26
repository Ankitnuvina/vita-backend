export interface BulletItem {
  type: 'bullet'
  text: string
}

export interface ParagraphItem {
  type: 'paragraph'
  text: string
}

export interface TableItem {
  type: 'table'
  headers: string[]
  rows: string[][]
}

export interface HeadingItem {
  type: 'heading'
  /** 2 = main sub-heading, 3 = nested, 4+ = deeper */
  level: 2 | 3 | 4 | 5 | 6
  text: string
}

export type SectionItem = BulletItem | ParagraphItem | TableItem | HeadingItem

export interface BlogSection {
  heading: string
  items: SectionItem[]
}
