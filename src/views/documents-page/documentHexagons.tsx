'use client'
import Hexagon from '../general/hexagon'

type DocumentHexagonsProps = {
  documentId: string
  setMainOption: (type: string | null) => void
  mainOption: string | null
  children: any
}

const DocumentHexagons = ({ documentId, setMainOption, children, mainOption }: DocumentHexagonsProps) => {
  return (
    <div style={{ position: 'absolute', left: '5%', top: '40%' }}>
      <div onClick={() => setMainOption(mainOption === 'view' ? null : 'view')}>
        <Hexagon icon='ri-eye-line' />
      </div>
      <div
        style={{ position: 'relative', left: '36px', bottom: '23px' }}
        onClick={() => setMainOption(mainOption === 'add' ? null : 'add')}
      >
        <Hexagon icon='ri-add-circle-line' />
      </div>
      <div
        style={{ position: 'relative', left: '0px', bottom: '46px' }}
        onClick={() => setMainOption(mainOption === 'info' ? null : 'info')}
      >
        <Hexagon icon='ri-information-line' />
      </div>
      {children}
    </div>
  )
}

export default DocumentHexagons
