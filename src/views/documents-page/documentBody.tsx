'use client'

// Type Imports
import type { AllFileType } from '@/types/pages/platformTypes'
import type { DocumentItemType } from '@/types/pages/platformTypes'

// Component Imports
import TextItem from './items/Text'
import HeaderItem from './items/Header'
import EquationItem from './items/Equation'
import SymbolicEquationItem from './items/Symbolic'
import SliderItem from './items/Slider'

type DocumentBodyProps = {
  documentFile: AllFileType
  documentData: DocumentItemType[]
  currentItem: DocumentItemType | null
  setCurrentItem: (type: DocumentItemType | null) => void
}

const DocumentBody = ({ documentFile, documentData, currentItem, setCurrentItem }: DocumentBodyProps) => {
  let ReturnItem = TextItem
  return documentData.map(item => {
    switch (item.type) {
      case 'text':
        ReturnItem = TextItem
        break
      case 'header':
        ReturnItem = HeaderItem
        break
      case 'equation':
        ReturnItem = EquationItem
        break
      case 'symbolicequation':
        ReturnItem = SymbolicEquationItem
        break
      case 'slider':
        ReturnItem = SliderItem
        break
    }
    return (
      <div
        onDoubleClick={() => setCurrentItem(item)}
        style={{ width: item.data.width || '100%', margin: item.data.yMargin + ' ' + item.data.xMargin }}
      >
        <ReturnItem item={item} current={item.sk === currentItem?.sk} setCurrentItem={setCurrentItem} />
      </div>
    )
  })
}

export default DocumentBody
