'use client'

// Type Imports
import type { AllFileType } from '@/types/pages/platformTypes'
import type { DocumentItemType } from '@/types/pages/platformTypes'

// Component Imports
import TextItem from './items/Text'
import HeaderItem from './items/Header'
import EquationItem from './items/Equation'

type DocumentBodyProps = {
  documentFile: AllFileType
  documentData: DocumentItemType[]
  currentItem: DocumentItemType | null
  setCurrentItem: (type: DocumentItemType | null) => void
}

const DocumentBody = ({ documentFile, documentData, currentItem, setCurrentItem }: DocumentBodyProps) => {
  return documentData.map(item => {
    switch (item.type) {
      case 'text':
        return (
          <span onDoubleClick={() => setCurrentItem(item)}>
            <TextItem item={item} />
          </span>
        )
      case 'header':
        return (
          <span onDoubleClick={() => setCurrentItem(item)}>
            <HeaderItem item={item} current={item.pk === currentItem?.pk} />
          </span>
        )
      case 'equation':
        return <EquationItem item={item} />
    }
  })
}

export default DocumentBody
