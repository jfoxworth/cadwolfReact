'use client'
import { styled } from '@mui/material/styles'

type HexagonProps = {
  icon: string
}

type HexagonBlockProps = {}
const size = '55px'
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
    top: '2px' /* border width */,
    left: '2px' /* border width */,
    height: 'calc(100% - 4px)' /* 100% - (2 * border width) */,
    width: 'calc(100% - 4px)' /* 100% - (2 * border width) */,
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

const HexagonSmall = ({ icon }: HexagonProps) => {
  return (
    <>
      <HexagonBlock>
        <i
          className={icon}
          style={{ width: '35px', height: '35px', position: 'relative', top: '10px', left: '10px' }}
        />
      </HexagonBlock>
    </>
  )
}

export default HexagonSmall
