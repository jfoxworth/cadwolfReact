// Type Imports
import type { AllFileType } from '@/types/pages/platformTypes'
import type { HeirarchyType } from '@/types/pages/platformTypes'

export const HeirarchyData: HeirarchyType[] = [
  {
    pk: 'Workspace0002BBBB',
    sk: 'Workspace0003CCCC',
    type: 'Workspace',
    data: {
      title: 'Third Workspace',
      description: 'This is the description',
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
    }
  },
  {
    pk: null,
    sk: 'Workspace0001AAAA',
    type: 'Workspace',
    data: {
      title: 'Top Workspace',
      description: 'This is the description',
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
    }
  },
  {
    pk: 'Workspace0001AAAA',
    sk: 'Workspace0002BBBB',
    type: 'Workspace',
    data: {
      title: 'Second Workspace',
      description: 'This is the description',
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
    }
  }
]

export const WorkspaceContents: AllFileType[] = [
  {
    pk: 'Workspace0001AAAA',
    sk: 'Document0001AAAA',
    type: 'Document',
    data: {
      title: 'Fancy Document 1',
      description: 'This is the description',
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
    }
  },
  {
    pk: 'Workspace0001AAAA',
    sk: 'Document0002BBBB',
    type: 'Document',
    data: {
      title: 'Fancy Document 2',
      description: 'This is the description',
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
    }
  },
  {
    pk: 'Workspace0001AAAA',
    sk: 'Document0003CCCC',
    type: 'Document',
    data: {
      title: 'Fancy Document 3',
      description: 'This is the description',
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
    }
  },
  {
    pk: 'Workspace0001AAAA',
    sk: 'Workspace0002BBBB',
    type: 'Workspace',
    data: {
      title: 'Fancy Workspace 1',
      description: 'This is the description',
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
    }
  },
  {
    pk: 'Workspace0001AAAA',
    sk: 'Dataset0002BBBB',
    type: 'Dataset',
    data: {
      title: 'Fancy Dataset 1',
      description: 'This is the description',
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
    }
  },
  {
    pk: 'Workspace0001AAAA',
    sk: 'PartTree0002BBBB',
    type: 'PartTree',
    data: {
      title: 'Fancy Part Tree 1',
      description: 'This is the description',
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
    }
  }
]
