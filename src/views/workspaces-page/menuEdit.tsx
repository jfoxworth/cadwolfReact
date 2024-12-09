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

const MenuEdit = ({ workspaceId, currentItem }: MenuEditProps) => {
  const [addType, setAddType] = useState('')
  return (
    <>
      <div
        style={{
          position: 'absolute',
          bottom: '220px',
          left: '45px',
          textAlign: 'center',
          width: '200px'
        }}
      >
        <Typography variant='h5'>{addType}</Typography>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '156px',
          left: '88px'
        }}
        onMouseEnter={() => setAddType('Edit Title')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-text' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '117px',
          left: '114px'
        }}
        onMouseEnter={() => setAddType('Edit Description')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-text-snippet' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '156px',
          left: '140px'
        }}
        onMouseEnter={() => setAddType('Edit Permissions')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-key-2-line' />
      </div>
    </>
  )
}

export default MenuEdit
