'use client'
import Hexagon from '../general/hexagon'

type WorkspaceHexagonsProps = {
  workspaceId: string
  mainOption: string | null
  setMainOption: (type: string | null) => void
  children: any
}

const WorkspaceHexagons = ({ workspaceId, setMainOption, mainOption, children }: WorkspaceHexagonsProps) => {
  return (
    <div style={{ position: 'absolute', left: '5%', top: '40%' }}>
      <div onClick={() => setMainOption(mainOption === 'add' ? null : 'add')}>
        <Hexagon icon='ri-add-circle-line' />
      </div>
      <div
        style={{ position: 'relative', left: '36px', bottom: '23px' }}
        onClick={() => setMainOption(mainOption === 'info' ? null : 'info')}
      >
        <Hexagon icon='ri-information-line' />
      </div>
      {children}
    </div>
  )
}

export default WorkspaceHexagons
