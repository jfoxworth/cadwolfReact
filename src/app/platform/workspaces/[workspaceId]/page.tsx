// Component Imports
import WorkspacesPageWrapper from '@views/workspaces-page'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

const WorkspacePage = () => {
  const mode = getServerMode()
  console.log(mode)
  return <WorkspacesPageWrapper mode={mode} />
}

export default WorkspacePage
