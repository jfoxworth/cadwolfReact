'use client'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'

import { DocumentItemType } from '@/types/pages/platformTypes'

type MenuItemProps = {
  documentId: string
  currentItem: DocumentItemType | null
}

const MenuItem = ({ documentId, currentItem }: MenuItemProps) => {
  return (
    <>
      <div
        style={{
          position: 'relative',
          bottom: '500px',
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
            bottom: '85px',
            left: '-40px',
            height: '85px',
            width: '100px',
            borderLeft: '3px solid #333',
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
              <i className='ri-folder-add-fill mx-2' />
              <Typography variant='h5' component='div'>
                Document
              </Typography>
            </Box>
            <Divider variant='middle' />
            <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
              <i className='ri-file-add-fill mx-2' />
              <Typography variant='h5' component='div'>
                Table of Contents
              </Typography>
            </Box>
            <Divider variant='middle' />
            <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
              <i className='ri-database-2-fill mx-2' />
              <Typography variant='h5' component='div'>
                Equations Only
              </Typography>
            </Box>
          </>
        )}
      </div>
    </>
  )
}

export default MenuItem
