'use client'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { HeirarchyType } from '@/types/pages/platformTypes'
import Link from 'next/link'

type DocumentOptionsProps = {
  heirarchyData: HeirarchyType[]
}

const DocumentHeirarchy = ({ heirarchyData }: DocumentOptionsProps) => {
  const sortedHeirarchy: HeirarchyType[] = []

  const findChild = (parent: string | null, data: HeirarchyType[]) => {
    const child: HeirarchyType = data.filter(item => item.pk === parent)[0]
    if (child) {
      sortedHeirarchy.push(child)
      findChild(child.sk, data)
    }
  }

  findChild(null, heirarchyData)

  return (
    <>
      <Box className='flex' alignItems='left' justifyContent='left'>
        <Typography variant='caption' gutterBottom>
          Current Location
        </Typography>
      </Box>
      <Box className='flex' alignItems='left' justifyContent='left' sx={{ pb: 4 }}>
        <Typography component='div' className='flex'>
          {sortedHeirarchy.map((hD, index) => (
            <Box className='flex' key={`hierarchy${index}`}>
              <Link href={`/document/${hD.sk}`}>{hD.data.title}</Link>
              <i className='ri-arrow-right-s-line mx-2' />
            </Box>
          ))}
        </Typography>
      </Box>
    </>
  )
}

export default DocumentHeirarchy
