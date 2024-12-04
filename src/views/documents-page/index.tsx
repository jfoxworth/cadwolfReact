'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { Grid } from '@mui/material'
import Card from '@mui/material/Card'

// Type Imports
import type { Mode } from '@core/types'
import { DocumentItemType } from '@/types/pages/platformTypes'

// Component Imports
import { useSettings } from '@core/hooks/useSettings'
import DocumentHeirarchy from './documentHeirarchy'
import MenuAdd from './menuAdd'
import MenuView from './menuView'
import MenuItem from './menuItem'
import DocumentTitle from './documentTitle'
import DocumentBody from './documentBody'
import DocumentHexagons from './documentHexagons'

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

  // State parameters
  const [mainOption, setMainOption] = useState<string | null>(null)
  const [currentItem, setCurrentItem] = useState<DocumentItemType | null>(null)

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
      <DocumentHexagons documentId={documentId.toString()} setMainOption={setMainOption} mainOption={mainOption}>
        {mainOption === 'add' && <MenuAdd documentId={documentId.toString()} />}
        {mainOption === 'view' && <MenuView documentId={documentId.toString()} />}
        {mainOption === 'info' && <MenuItem documentId={documentId.toString()} currentItem={currentItem} />}
      </DocumentHexagons>
      <Grid item xs={2} />
      <Grid item xs={8}>
        <Card variant='outlined' sx={{ minWidth: 600, minHeight: 800 }}>
          <DocumentTitle title={'This is the title'} />
          <DocumentBody
            documentData={DocumentData}
            documentFile={DocumentFile}
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
          />
        </Card>
      </Grid>
      <Grid item xs={2} />
    </Grid>
  )
}

export default DocumentsPageWrapper
