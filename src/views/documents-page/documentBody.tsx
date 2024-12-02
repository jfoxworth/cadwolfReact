'use client'

// Type Imports
import type { AllFileType } from '@/types/pages/platformTypes'
import type { DocumentItemType } from '@/types/pages/platformTypes'

// Component Imports
import TextItem from './items/Text'
import EquationItem from './items/Equation'

type DocumentBodyProps = {
  documentFile: AllFileType
  documentData: DocumentItemType[]
}

const DocumentBody = ({ documentFile, documentData }: DocumentBodyProps) => {
  return documentData.map(item => {
    switch (item.type) {
      case 'text':
        return <TextItem item={item} />
      case 'equation':
        return <EquationItem item={item} />
    }
  })
}

export default DocumentBody
