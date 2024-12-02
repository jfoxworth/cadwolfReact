'use client'

// Type Imports
import type { DocumentItemType } from '@/types/pages/platformTypes'

// MUI Imports
import { Typography } from '@mui/material'
import Box from '@mui/material/Box'

// Component Import
import ItemDropdown from './DropDown'

type HeaderProps = {
  item: DocumentItemType
}

const HeaderItem = ({ item }: HeaderProps) => {
  let textItem = <Typography variant='h5'>{item.data.text}</Typography>
  switch (item.data.headerLevel) {
    case 1:
      textItem = <Typography variant='h1'>{item.data.text}</Typography>
    case 2:
      textItem = <Typography variant='h2'>{item.data.text}</Typography>
    case 3:
      textItem = <Typography variant='h3'>{item.data.text}</Typography>
    case 4:
      textItem = <Typography variant='h4'>{item.data.text}</Typography>
  }
  let returnItem = (
    <Box sx={{ position: 'relative' }}>
      <ItemDropdown itemId={item.pk} itemType={item.type} />
      {textItem}
    </Box>
  )
  return returnItem
}

export default HeaderItem
