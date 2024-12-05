'use client'

// Type Imports
import type { DocumentItemType } from '@/types/pages/platformTypes'

type TextProps = {
  item: DocumentItemType
  current: boolean
  setCurrentItem: (type: DocumentItemType | null) => void
}

const TextItem = ({ item }: TextProps) => {
  return <>Text</>
}

export default TextItem
