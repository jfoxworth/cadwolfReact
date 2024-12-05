'use client'

// Type Imports
import type { DocumentItemType } from '@/types/pages/platformTypes'
import { SelectChangeEvent } from '@mui/material'

// MUI Imports
import { Typography } from '@mui/material'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

type HeaderProps = {
  item: DocumentItemType
  current: boolean
  setCurrentItem: (type: DocumentItemType | null) => void
}

const HeaderItem = ({ item, current, setCurrentItem }: HeaderProps) => {
  // If this item isn't being edited, show it like normal
  const ShowHeader = ({ text, level }: { text: string; level: number }) => {
    let textItem = <Typography variant='h5'>{text}</Typography>
    switch (level) {
      case 1:
        textItem = <Typography variant='h1'>{text}</Typography>
        break
      case 2:
        textItem = <Typography variant='h2'>{text}</Typography>
        break
      case 3:
        textItem = <Typography variant='h3'>{text}</Typography>
        break
      case 4:
        textItem = <Typography variant='h4'>{text}</Typography>
        break
      default:
    }
    return textItem
  }

  // If this item is being edited, show it in a text box with the header select

  const onOptionChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as number
    item.data.headerLevel = value
  }
  const handleEnterPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const target = event.target as HTMLTextAreaElement
      item.data.text = target.value || ''
      setCurrentItem(null)
    }
  }

  if (!current) {
    return <ShowHeader text={item.data.text} level={item.data.headerLevel || 0} />
  } else {
    return (
      <div className='flex'>
        <Select variant='standard' value={item.data.headerLevel} sx={{ width: '55px' }} onChange={onOptionChange}>
          <MenuItem value={1}>H1</MenuItem>
          <MenuItem value={2}>H2</MenuItem>
          <MenuItem value={3}>H3</MenuItem>
          <MenuItem value={4}>H4</MenuItem>
          <MenuItem value={5}>H5</MenuItem>
        </Select>
        <TextField
          fullWidth
          label='Header Text'
          variant='standard'
          defaultValue={item.data.text}
          onKeyDown={handleEnterPress}
        />
      </div>
    )
  }
}

export default HeaderItem
