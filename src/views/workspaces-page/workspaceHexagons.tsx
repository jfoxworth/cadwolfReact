'use client'
import Hexagon from '../general/hexagon'
import CurrentHexagon from '../general/currenthexagon'

type WorkspaceHexagonsProps = {
  workspaceId: string
  mainOption: string | null
  setMainOption: (type: string | null) => void
  children: any
}

const WorkspaceHexagons = ({ workspaceId, setMainOption, mainOption, children }: WorkspaceHexagonsProps) => {
  return (
    <div style={{ position: 'absolute', left: '2%', top: '40%' }}>
      <div onClick={() => setMainOption(mainOption === 'add' ? null : 'add')}>
        {mainOption === 'add' && <CurrentHexagon icon='ri-add-circle-line' text={'Add'} />}
        {mainOption !== 'add' && <Hexagon icon='ri-add-circle-line' text={'Add'} />}
      </div>
      <div
        style={{ position: 'relative', left: '36px', bottom: '23px' }}
        onClick={() => setMainOption(mainOption === 'edit' ? null : 'edit')}
      >
        {mainOption === 'edit' && <CurrentHexagon icon='ri-add-circle-line' text={'Edit'} />}
        {mainOption !== 'edit' && <Hexagon icon='ri-add-circle-line' text={'Edit'} />}
      </div>
      <div
        style={{ position: 'relative', left: '0px', bottom: '44px' }}
        onClick={() => setMainOption(mainOption === 'item' ? null : 'item')}
      >
        {mainOption === 'item' && <CurrentHexagon icon='ri-add-circle-line' text={'Item'} />}
        {mainOption !== 'item' && <Hexagon icon='ri-add-circle-line' text={'Item'} />}
      </div>
      {children}
    </div>
  )
}

export default WorkspaceHexagons
