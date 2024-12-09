'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Typography from '@mui/material/Typography'

// Component Imports
import HexagonSmall from '../general/hexagonSmall'

type MenuAddProps = {
  documentId: string
}

const MenuAdd = ({ documentId }: MenuAddProps) => {
  const [addType, setAddType] = useState('')
  return (
    <>
      <div
        style={{
          position: 'absolute',
          bottom: '135px',
          right: '-97px',
          textAlign: 'center',
          width: '62px',
          borderTop: '2px solid #333'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '260px',
          right: '-220px',
          textAlign: 'center',
          width: '200px'
        }}
      >
        <Typography variant='h5'>{addType}</Typography>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '190px',
          right: '-100px'
        }}
        onMouseEnter={() => setAddType('Equation')}
        onMouseLeave={() => setAddType('')}
      >
        <HexagonSmall icon='ri-formula' /> {/*Equation*/}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '190px',
          right: '-153px'
        }}
        onMouseEnter={() => setAddType('Text')}
        onMouseLeave={() => setAddType('')}
      >
        {/* Text */}
        <HexagonSmall icon='ri-text' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '190px',
          right: '-205px'
        }}
        onMouseEnter={() => setAddType('Header')}
        onMouseLeave={() => setAddType('')}
      >
        {/* Header */}
        <HexagonSmall icon='ri-h-1' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '150px',
          right: '-126px'
        }}
        onMouseEnter={() => setAddType('Symbolic Equation')}
        onMouseLeave={() => setAddType('')}
      >
        {/* Symbolic Equation */}
        <HexagonSmall icon='ri-superscript' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '150px',
          right: '-179px'
        }}
        onMouseEnter={() => setAddType('Image')}
        onMouseLeave={() => setAddType('')}
      >
        {/* Image */}
        <HexagonSmall icon='ri-image-2-line' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '150px',
          right: '-232px'
        }}
        onMouseEnter={() => setAddType('Video')}
        onMouseLeave={() => setAddType('')}
      >
        {/*  */}
        <HexagonSmall icon='ri-youtube-line' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '110px',
          right: '-152px'
        }}
        onMouseEnter={() => setAddType('Slider')}
        onMouseLeave={() => setAddType('')}
      >
        {/*  */}
        <HexagonSmall icon='ri-equalizer-line' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '110px',
          right: '-205px'
        }}
        onMouseEnter={() => setAddType('Select Block')}
        onMouseLeave={() => setAddType('')}
      >
        {/*  */}
        <HexagonSmall icon='ri-cursor-fill' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '110px',
          right: '-258px'
        }}
        onMouseEnter={() => setAddType('Radio Block')}
        onMouseLeave={() => setAddType('')}
      >
        {/*  */}
        <HexagonSmall icon='ri-radio-button-line' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '70px',
          right: '-125px'
        }}
        onMouseEnter={() => setAddType('If Else Block')}
        onMouseLeave={() => setAddType('')}
      >
        {/* If/else  */}
        <HexagonSmall icon='ri-organization-chart' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '70px',
          right: '-178px'
        }}
        onMouseEnter={() => setAddType('For Loop')}
        onMouseLeave={() => setAddType('')}
      >
        {/* While Loop */}
        <HexagonSmall icon='ri-replay-5-fill' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '70px',
          right: '-231px'
        }}
        onMouseEnter={() => setAddType('While Loop')}
        onMouseLeave={() => setAddType('')}
      >
        {/* While Loop */}
        <HexagonSmall icon='ri-loop-left-line' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
          right: '-99px'
        }}
        onMouseEnter={() => setAddType('Chart')}
        onMouseLeave={() => setAddType('')}
      >
        {/* Image */}
        <HexagonSmall icon='ri-bar-chart-box-line' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
          right: '-150px'
        }}
        onMouseEnter={() => setAddType('3D Chart')}
        onMouseLeave={() => setAddType('')}
      >
        {/* 3D Chart */}
        <HexagonSmall icon='ri-box-3-line' />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
          right: '-204px'
        }}
        onMouseEnter={() => setAddType('Divider')}
        onMouseLeave={() => setAddType('')}
      >
        {/*  */}
        <HexagonSmall icon='ri-qr-scan-2-fill' />
      </div>
    </>
  )
  /*

  return (
    <>
      <div
        style={{
          position: 'relative',
          bottom: '500px',
          left: '150px',
          border: '3px solid #333',
          borderRadius: '10px',
          backgroundColor: '#FFF',
          zIndex: '9999'
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '85px',
            left: '-40px',
            height: '85px',
            width: '100px',
            borderLeft: '3px solid #333',
            transform: 'skew(-40deg)'
          }}
        />
        <Box
          sx={{ p: 3, backgroundColor: '#EEE', borderRadius: '8px 8px 0px 0px' }}
          className='flex'
          alignItems='center'
          justifyContent='center'
        >
          <Typography variant='h4' component='div'>
            Add Item to Document
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-folder-add-fill mx-2' />
          <Typography variant='h5' component='div'>
            Header
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-file-add-fill mx-2' />
          <Typography variant='h5' component='div'>
            Text
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-database-2-fill mx-2' />
          <Typography variant='h5' component='div'>
            Equation
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-node-tree mx-2' />
          <Typography variant='h5' component='div'>
            Symbolic Equation
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-node-tree mx-2' />
          <Typography variant='h5' component='div'>
            Slider
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-node-tree mx-2' />
          <Typography variant='h5' component='div'>
            Radio Select
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-node-tree mx-2' />
          <Typography variant='h5' component='div'>
            Dropdown Select
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-node-tree mx-2' />
          <Typography variant='h5' component='div'>
            If/Else Statement
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-node-tree mx-2' />
          <Typography variant='h5' component='div'>
            For Loop
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-node-tree mx-2' />
          <Typography variant='h5' component='div'>
            While Loop
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-node-tree mx-2' />
          <Typography variant='h5' component='div'>
            Chart
          </Typography>
        </Box>
        <Divider variant='middle' />
        <Box sx={{ p: 3, cursor: 'pointer' }} className='flex'>
          <i className='ri-node-tree mx-2' />
          <Typography variant='h5' component='div'>
            3D Chart
          </Typography>
        </Box>
      </div>
    </>
  )
  */
}

export default MenuAdd
