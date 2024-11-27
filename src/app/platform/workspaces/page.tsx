// Component Imports
import WorkspacesPageWrapper from '@views/workspaces-page'

// Data Imports
import { db } from '@/fake-db/pages/workspaces'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

const WorkspacePage = () => {
  console.log('In workspace')
  const mode = getServerMode()
  return <WorkspacesPageWrapper mode={mode} data={db} />
}

export default WorkspacePage
