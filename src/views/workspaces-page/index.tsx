'use client'

// React Imports
import { useEffect } from 'react'
import { useParams } from 'next/navigation'

import { Grid } from '@mui/material'

// Type Imports
import type { Mode } from '@core/types'
import { WorkspaceType } from '@/types/pages/workspaceTypes'

// Component Imports
import { useSettings } from '@core/hooks/useSettings'
import WorkspaceTitle from './workspaceTitle'
import WorkspaceOptions from './workspaceOptions'

// Data Imports
import { db } from '@/fake-db/pages/workspaces'

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
    <Grid container spacing={2} columns={12}>
      <Grid item xs={12}>
        <WorkspaceTitle title={'This is the title'} />
      </Grid>
      <Grid item xs={2} />
      <Grid item xs={2}>
        <WorkspaceOptions workspaceId={workspaceId.toString()} />
      </Grid>
      <Grid item xs={6}></Grid>
      <Grid item xs={2} />
    </Grid>
  )
}

export default WorkspacesPageWrapper
