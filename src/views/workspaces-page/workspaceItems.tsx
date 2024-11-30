'use client'
import Link from 'next/link'
import type { AllFileType } from '@/types/pages/platformTypes'
import { styled } from '@mui/material/styles'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell, { tableCellClasses } from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

type WorkspaceOptionsProps = {
  workspaceContents: AllFileType[]
}

const WorkspaceItems = ({ workspaceContents }: WorkspaceOptionsProps) => {
  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      fontSize: 18
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 14
    }
  }))

  const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {},
    // hide last border
    '&:last-child td, &:last-child th': {
      border: 0
    }
  }))

  const TimeDisplay = (dateString: string) => {
    return new Date(dateString).toDateString()
  }

  return (
    <TableContainer sx={{ p: 4 }}>
      <Table aria-label='customized table'>
        <TableHead>
          <TableRow>
            <StyledTableCell align='center'>Type</StyledTableCell>
            <StyledTableCell align='center'>Title</StyledTableCell>
            <StyledTableCell align='center'>Date Created</StyledTableCell>
            <StyledTableCell align='center'>Last Modified</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {workspaceContents.map(item => (
            <StyledTableRow hover key={item.data.title}>
              <StyledTableCell align='center'>
                {item.type === 'Workspace' && (
                  <Link href={`/workspace/${item.sk}`}>
                    <i className='ri-folder-line mx-2' />
                  </Link>
                )}
                {item.type === 'Document' && (
                  <Link href={`/document/${item.sk}`}>
                    <i className='ri-file-text-line mx-2' />
                  </Link>
                )}
                {item.type === 'PartTree' && (
                  <Link href={`/parttree/${item.sk}`}>
                    <i className='ri-node-tree mx-2' />
                  </Link>
                )}
                {item.type === 'Dataset' && (
                  <Link href={`/dataset/${item.sk}`}>
                    <i className='ri-database-2-line mx-2' />
                  </Link>
                )}
              </StyledTableCell>
              <StyledTableCell align='center'>{item.data.title}</StyledTableCell>
              <StyledTableCell align='center'>{TimeDisplay(item.data.dateCreated)}</StyledTableCell>
              <StyledTableCell align='center'>{TimeDisplay(item.data.dateLastUpdated)}</StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default WorkspaceItems
