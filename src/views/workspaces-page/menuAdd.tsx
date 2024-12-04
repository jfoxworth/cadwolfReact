'use client'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'

type MenuAddProps = {
  workspaceId: string
}

const MenuAdd = ({ workspaceId }: MenuAddProps) => {
  return (
    <>
      <div
        style={{
          position: 'relative',
          bottom: '250px',
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
            bottom: '135px',
            left: '-80px',
            height: '1px',
            width: '80px',
            borderTop: '3px solid #333',
            transform: 'skew(20deg)'
          }}
        />
        <Box
          sx={{ p: 3, backgroundColor: '#EEE', borderRadius: '8px 8px 0px 0px' }}
          className='flex'
          alignItems='center'
          justifyContent='center'
        >
          <Typography variant='h4' component='div'>
            Add Item to Workspace
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-folder-add-fill mx-2' />
          <Typography variant='h5' component='div'>
            Workspace
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-file-add-fill mx-2' />
          <Typography variant='h5' component='div'>
            Document
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-database-2-fill mx-2' />
          <Typography variant='h5' component='div'>
            Dataset
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-node-tree mx-2' />
          <Typography variant='h5' component='div'>
            Part Tree
          </Typography>
        </Box>
      </div>
    </>
  )
}

export default MenuAdd
