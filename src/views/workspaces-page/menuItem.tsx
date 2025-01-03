'use client'
// React Imports
import { useState } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'

// Component Imports
import HexagonSmall from '../general/hexagonSmall'
import { AllFileType } from '@/types/pages/platformTypes'

type MenuEditProps = {
  workspaceId: string
  currentItem: AllFileType | null
}

const MenuItem = ({ workspaceId, currentItem }: MenuEditProps) => {
  const [addType, setAddType] = useState('')
  return (
    <>
      <div
        style={{
          position: 'absolute',
          bottom: '-70px',
          left: '10px',
          textAlign: 'center',
          width: '200px'
        }}
      >
        <Typography variant='h5'>{addType}</Typography>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '46px',
          left: '78px'
        }}
        onMouseEnter={() => setAddType('Move Item')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-file-transfer-line' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '6px',
          left: '52px'
        }}
        onMouseEnter={() => setAddType('Copy Item')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-file-copy-2-line' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '6px',
          left: '105px'
        }}
        onMouseEnter={() => setAddType('View Item Log')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-database-line' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '-34px',
          left: '78px'
        }}
        onMouseEnter={() => setAddType('Delete Item')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-delete-bin-5-line' />
      </div>
    </>
  )
}

export default MenuItem
