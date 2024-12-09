'use client'
// React Imports
import { useState } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'

// Component Imports
import HexagonSmall from '../general/hexagonSmall'

type MenuAddProps = {
  workspaceId: string
}

const MenuAdd = ({ workspaceId }: MenuAddProps) => {
  const [addType, setAddType] = useState('')
  return (
    <>
      <div
        style={{
          position: 'absolute',
          bottom: '320px',
          left: '-25px',
          textAlign: 'center',
          width: '200px'
        }}
      >
        <Typography variant='h5'>{addType}</Typography>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '255px',
          left: '11px'
        }}
        onMouseEnter={() => setAddType('Workspace')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-folder-add-fill' /> {/*Worskpace*/}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '255px',
          left: '64px'
        }}
        onMouseEnter={() => setAddType('Document')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-file-add-fill' /> {/*Document*/}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '215px',
          left: '-15px'
        }}
        onMouseEnter={() => setAddType('Dataset')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-database-2-fill' /> {/*Dataset*/}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '215px',
          left: '38px'
        }}
        onMouseEnter={() => setAddType('Part Tree')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-node-tree' /> {/*Part Tree*/}
      </div>
    </>
  )
}

export default MenuAdd
