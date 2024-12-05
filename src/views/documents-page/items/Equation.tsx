'use client'

// Type Imports
import type { DocumentItemType } from '@/types/pages/platformTypes'

type EquationProps = {
  item: DocumentItemType
  current: boolean
  setCurrentItem: (type: DocumentItemType | null) => void
}

const EquationItem = ({ item }: EquationProps) => {
  return <>Equation</>
}

export default EquationItem
