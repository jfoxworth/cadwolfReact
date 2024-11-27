// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import Footer from '@components/layout/platform/Footer'
import Header from '@components/layout/platform/Header'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Util Imports
import { frontLayoutClasses } from '@layouts/utils/layoutClasses'

const PlatformLayout = ({ children }: ChildrenType) => {
  // Vars
  const mode = getServerMode()

  return (
    <div className={frontLayoutClasses.root}>
      <Header mode={mode} />
      {children}
      <Footer />
    </div>
  )
}

export default PlatformLayout
