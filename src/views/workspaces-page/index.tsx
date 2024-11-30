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
import WorkspaceTitle from './workspaceTitle'
import WorkspaceOptions from './workspaceOptions'
import WorkspaceItems from './workspaceItems'
import WorkspaceHeirarchy from './workspaceHeirarchy'

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
      <Grid item xs={2} />
      <Grid item xs={2}>
        <WorkspaceOptions workspaceId={workspaceId.toString()} />
      </Grid>
      <Grid item xs={6}>
        <Card variant='outlined' sx={{ minWidth: 600 }}>
          <WorkspaceTitle title={'This is the title'} />
          <WorkspaceItems workspaceContents={WorkspaceContents} />
        </Card>
      </Grid>
      <Grid item xs={2} />
    </Grid>
  )
}

export default WorkspacesPageWrapper
