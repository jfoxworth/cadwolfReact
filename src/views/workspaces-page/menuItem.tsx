'use client'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'

import { AllFileType } from '@/types/pages/platformTypes'

type MenuItemProps = {
  workspaceId: string
  currentItem: AllFileType | null
}

const MenuItem = ({ workspaceId, currentItem }: MenuItemProps) => {
  return (
    <>
      <div
        style={{
          position: 'relative',
          bottom: '100px',
          left: '150px',
          border: '3px solid #333',
          borderRadius: '10px',
          backgroundColor: '#FFF',
          zIndex: '9999'
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '-5px',
            left: '-78px',
            height: '85px',
            width: '42px',
            borderTop: '3px solid #333',
            transform: 'skew(-40deg)'
          }}
        />
        <Box
          sx={{ p: 3, backgroundColor: '#EEE', borderRadius: '8px 8px 0px 0px' }}
          className='flex'
          alignItems='center'
          justifyContent='center'
        >
          <Typography variant='h4' component='div'>
            Item properties
          </Typography>
        </Box>
        <Divider />

        {!currentItem && (
          <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
            <Typography variant='h5' component='div'>
              No item selected
            </Typography>
          </Box>
        )}

        {currentItem && (
          <>
            <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
              Type : {currentItem.type}
            </Box>
            <Divider variant='middle' />
          </>
        )}
      </div>
    </>
  )
}

export default MenuItem
