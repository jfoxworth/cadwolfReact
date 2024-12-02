'use client'

// Type Imports
import { Typography } from '@mui/material'
import Box from '@mui/material/Box'

type ItemDropdownProps = {
  itemId: string
  itemType: string
}

const ItemDropdown = ({ itemId, itemType }: ItemDropdownProps) => {
  return (
    <Box
      style={{
        position: 'absolute',
        right: '10px',
        cursor: 'pointer'
      }}
    >
      <i className='ri-settings-4-line' />
    </Box>
  )
}

export default ItemDropdown
