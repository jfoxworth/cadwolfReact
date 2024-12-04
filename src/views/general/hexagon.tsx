'use client'
import { styled } from '@mui/material/styles'

type HexagonProps = {
  icon: string
}

type HexagonBlockProps = {}

const HexagonBlock = styled('div')<HexagonBlockProps>({
  position: 'relative',
  height: '75px',
  width: '75px',
  background: '#333',
  cursor: 'pointer',
  webkitClipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
  '&:before': {
    position: 'absolute',
    content: '""',
    top: '3px' /* border width */,
    left: '3px' /* border width */,
    height: 'calc(100% - 6px)' /* 100% - (2 * border width) */,
    width: 'calc(100% - 6px)' /* 100% - (2 * border width) */,
    background: '#FFF',
    webkitClipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
  },
  '&:after': {
    webkitClipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
  },
  '&:hover::before': {
    background: '#CCC'
  }
})

const Hexagon = ({ icon }: HexagonProps) => {
  return (
    <HexagonBlock>
      <i className={icon} style={{ width: '75px', height: '50px', position: 'relative', top: '12px' }} />
    </HexagonBlock>
  )
}

export default Hexagon
