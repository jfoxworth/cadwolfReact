'use client'

// React Imports
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { Grid } from '@mui/material'
import Card from '@mui/material/Card'

// Type Imports
import type { Mode } from '@core/types'
import type { AllFileType } from '@/types/pages/platformTypes'

// Component Imports
import { useSettings } from '@core/hooks/useSettings'
import WorkspaceTitle from './workspaceTitle'
import WorkspaceItems from './workspaceItems'
import WorkspaceHeirarchy from './workspaceHeirarchy'
import WorkspaceHexagons from './workspaceHexagons'
import MenuAdd from './menuAdd'
import MenuItem from './menuItem'

// Data Imports
import { WorkspaceContents } from '@/fake-db/pages/workspaces'
import { HeirarchyData } from '@/fake-db/pages/workspaces'

type WorkspacesPageWrapperProps = {
  mode: Mode
}

const WorkspacesPageWrapper = ({ mode }: WorkspacesPageWrapperProps) => {
  const { workspaceId } = useParams()
  // Hooks
  const { updatePageSettings } = useSettings()

  // State parameters
  const [mainOption, setMainOption] = useState<string | null>(null)
  const [currentItem, setCurrentItem] = useState<AllFileType | null>(null)

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
        <WorkspaceHeirarchy heirarchyData={HeirarchyData} />
      </Grid>
      <Grid item xs={2} />
      <WorkspaceHexagons workspaceId={workspaceId.toString()} setMainOption={setMainOption} mainOption={mainOption}>
        {mainOption === 'add' && <MenuAdd workspaceId={workspaceId.toString()} />}
        {mainOption === 'info' && <MenuItem workspaceId={workspaceId.toString()} currentItem={currentItem} />}
      </WorkspaceHexagons>

      <Grid item xs={4} />
      <Grid item xs={6}>
        <Card variant='outlined' sx={{ minWidth: 600, minHeight: 1000 }}>
          <WorkspaceTitle title={'This is the title'} />
          <WorkspaceItems workspaceContents={WorkspaceContents} setCurrentItem={setCurrentItem} />
        </Card>
      </Grid>
      <Grid item xs={2} />
    </Grid>
  )
}

export default WorkspacesPageWrapper
