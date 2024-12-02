'use client'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

type DocumentTitleProps = {
  title: string
}

const DocumentTitle = ({ title }: DocumentTitleProps) => {
  return (
    <Box display='flex' justifyContent='center' alignItems='center' sx={{ py: 5 }}>
      <Typography variant='h2'> Document - {title}</Typography>
    </Box>
  )
}

export default DocumentTitle
