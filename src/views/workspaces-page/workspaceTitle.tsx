'use client'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

type WorkspaceTitleProps = {
  title: string
}

const WorkspaceTitle = ({ title }: WorkspaceTitleProps) => {
  return (
    <Box display='flex' justifyContent='center' alignItems='center' sx={{ py: 5 }}>
      <Typography variant='h2'> Workspace - {title}</Typography>
    </Box>
  )
}

export default WorkspaceTitle
