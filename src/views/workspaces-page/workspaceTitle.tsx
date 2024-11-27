'use client'
import Typography from '@mui/material/Typography'

type WorkspaceTitleProps = {
  title: string
}

const WorkspaceTitle = ({ title }: WorkspaceTitleProps) => {
  return <Typography variant='h2'>{title}</Typography>
}

export default WorkspaceTitle
