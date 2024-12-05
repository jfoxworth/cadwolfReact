'use client'

// Latex specific items - https://github.com/harunurhan/react-latex-next
import 'katex/dist/katex.min.css'
import Latex from 'react-latex-next'

// Type Imports
import type { DocumentItemType } from '@/types/pages/platformTypes'

// MUI Imports
import TextField from '@mui/material/TextField'

type SymbolicEquationProps = {
  item: DocumentItemType
  current: boolean
  setCurrentItem: (type: DocumentItemType | null) => void
}

const SymbolicEquationItem = ({ item, current, setCurrentItem }: SymbolicEquationProps) => {
  const handleEnterPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const target = event.target as HTMLTextAreaElement
      item.data.text = target.value || ''
      setCurrentItem(null)
    }
  }

  if (!current) {
    return <Latex>{'$' + item.data.text + '$'}</Latex>
  } else {
    return (
      <div className='flex'>
        <TextField
          fullWidth
          label='Enter Symbolic Equation'
          variant='standard'
          defaultValue={item.data.text}
          onKeyDown={handleEnterPress}
        />
      </div>
    )
  }
}

export default SymbolicEquationItem
