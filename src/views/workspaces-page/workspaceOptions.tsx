'use client'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'

type WorkspaceOptionsProps = {
  workspaceId: string
}

const WorkspaceOptions = ({ workspaceId }: WorkspaceOptionsProps) => {
  return (
    <Card variant='outlined'>
      <Box sx={{ p: 3 }} className='flex' alignItems='center' justifyContent='center'>
        <Typography variant='h4' component='div'>
          Workspace Options
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
        <i className='ri-folder-add-fill mx-2' />
        <Typography variant='h5' component='div'>
          Add Workspace
        </Typography>
      </Box>
      <Divider variant='middle' />
      <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
        <i className='ri-file-add-fill mx-2' />
        <Typography variant='h5' component='div'>
          Add Document
        </Typography>
      </Box>
      <Divider variant='middle' />
      <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
        <i className='ri-database-2-fill mx-2' />
        <Typography variant='h5' component='div'>
          Add Dataset
        </Typography>
      </Box>
      <Divider variant='middle' />
      <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
        <i className='ri-node-tree mx-2' />
        <Typography variant='h5' component='div'>
          Add Part Tree
        </Typography>
      </Box>
    </Card>
  )
}

export default WorkspaceOptions
