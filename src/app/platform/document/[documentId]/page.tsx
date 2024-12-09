// Component Imports
import DocumentPageWrapper from '@views/documents-page'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

const DocumentPage = () => {
  const mode = getServerMode()
  return <DocumentPageWrapper mode={mode} />
}

export default DocumentPage
