'use client'

// Type Imports
import type { DocumentItemType } from '@/types/pages/platformTypes'

// MUI Imports
import Slider from '@mui/material/Slider'

type SliderProps = {
  item: DocumentItemType
  current: boolean
  setCurrentItem: (type: DocumentItemType | null) => void
}

const SliderItem = ({ item }: SliderProps) => {
  return (
    <Slider
      marks
      min={item.data.slider?.minValue}
      max={item.data.slider?.maxValue}
      step={item.data.slider?.stepIncrement}
      defaultValue={item.data.slider?.value}
      valueLabelDisplay={'auto'}
      orientation={item.data.slider?.orientation === 'vertical' ? 'vertical' : 'horizontal'}
    />
  )
}

export default SliderItem
