'use client'

// React imports
import { useEffect } from 'react'

// Type Imports
import type { AllFileType } from '@/types/pages/platformTypes'
import type { DocumentItemType } from '@/types/pages/platformTypes'

// Component Imports
import TextItem from './items/Text'
import HeaderItem from './items/Header'
import EquationItem from './items/Equation'
import SymbolicEquationItem from './items/Symbolic'
import SliderItem from './items/Slider'

//import Worker from 'worker-loader!../../utils/eqSolver.js'

type DocumentBodyProps = {
  documentFile: AllFileType
  documentData: DocumentItemType[]
  currentItem: DocumentItemType | null
  setCurrentItem: (type: DocumentItemType | null) => void
}

const DocumentBody = ({ documentFile, documentData, currentItem, setCurrentItem }: DocumentBodyProps) => {
  useEffect(() => {
    console.log('In Effect')
    if (window.Worker) {
      const sendObj = {
        cadwolfType: 'Solvequation',
        eqID: '',
        FileID: '',
        Location: 0,
        eqObj: {},
        ID: '',
        order: 0
      }

      const solver = new Worker(new URL('../../utils/eqSolver.ts', import.meta.url))
      console.log('Calling worker')
      solver.postMessage({
        fileId: 'abc123',
        cadwolfType: 'solveEquation',
        eqID: '11111111',
        equation: 'x=1+2',
        DOMObject: []
      })
      solver.onmessage = (e: MessageEvent<string>) => {
        console.log('Returned')
        console.log(e)
      }
    }
  }, [])

  let ReturnItem = TextItem
  return documentData.map((item, index) => {
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
        key={'item' + index}
        onDoubleClick={() => setCurrentItem(item)}
        style={{ width: item.data.width || '100%', margin: item.data.yMargin + ' ' + item.data.xMargin }}
      >
        <ReturnItem item={item} current={item.sk === currentItem?.sk} setCurrentItem={setCurrentItem} />
      </div>
    )
  })
}

export default DocumentBody
