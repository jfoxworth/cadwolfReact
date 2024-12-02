'use client'

// React Imports
import { useEffect } from 'react'
import { useParams } from 'next/navigation'

import { Grid } from '@mui/material'
import Card from '@mui/material/Card'

// Type Imports
import type { Mode } from '@core/types'

// Component Imports
import { useSettings } from '@core/hooks/useSettings'
import DocumentHeirarchy from './documentHeirarchy'
import DocumentOptions from './documentOptions'
import DocumentTitle from './documentTitle'
import DocumentBody from './documentBody'

// Data Imports
import { DocumentFile } from '@/fake-db/pages/documents'
import { DocumentData } from '@/fake-db/pages/documents'
import { HeirarchyData } from '@/fake-db/pages/workspaces'

type DocumentPageWrapperProps = {
  mode: Mode
}

const DocumentsPageWrapper = ({ mode }: DocumentPageWrapperProps) => {
  const { documentId } = useParams()

  // Hooks
  const { updatePageSettings } = useSettings()

  // For Page specific settings
  useEffect(() => {
    return updatePageSettings({
      skin: 'default'
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Grid container spacing={2} columns={12} sx={{ py: 6 }}>
      <Grid item xs={2} />
      <Grid item xs={8}>
        <DocumentHeirarchy heirarchyData={HeirarchyData} />
      </Grid>
      <Grid item xs={2} />
      <Grid item xs={2} />
      <Grid item xs={2}>
        <DocumentOptions documentId={documentId.toString()} />
      </Grid>
      <Grid item xs={6}>
        <Card variant='outlined' sx={{ minWidth: 600, minHeight: 800 }}>
          <DocumentTitle title={'This is the title'} />
          <DocumentBody documentData={DocumentData} documentFile={DocumentFile} />
        </Card>
      </Grid>
      <Grid item xs={2} />
    </Grid>
  )
}

export default DocumentsPageWrapper
