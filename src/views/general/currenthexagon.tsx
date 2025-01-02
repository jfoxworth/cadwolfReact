'use client'
import { styled } from '@mui/material/styles'

type HexagonProps = {
  icon: string
  text: string
}

type HexagonBlockProps = {}
const size = '75px'
const HexagonBlock = styled('div')<HexagonBlockProps>({
  position: 'relative',
  height: size,
  width: size,
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
    background: '#FFF'
  }
})

const CurrentHexagon = ({ icon, text }: HexagonProps) => {
  return (
    <HexagonBlock>
      <i className={icon} style={{ width: '75px', height: '50px', position: 'relative', top: '10px' }} />
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '12px',
          fontSize: '0.65em',
          rotate: '28deg',
          textTransform: 'uppercase'
        }}
      >
        {text}
      </div>
    </HexagonBlock>
  )
}

export default CurrentHexagon
