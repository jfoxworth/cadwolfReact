'use client'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'

type WorkspaceOptionsProps = {
  workspaceId: string
}

const WorkspaceItems = ({ workspaceId }: WorkspaceOptionsProps) => {
  return (
    <Card variant='outlined' sx={{ minWidth: 600 }}>
      <Box sx={{ p: 3 }} className='flex' alignItems='center' justifyContent='center'>
        <Typography variant='h4' component='div'>
          Workspace Options
        </Typography>
      </Box>
      <Divider />
    </Card>
  )
}

export default WorkspaceItems
