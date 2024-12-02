import type { AllFileType } from '@/types/pages/platformTypes'
import type { DocumentItemType } from '@/types/pages/platformTypes'

export const DocumentFile: AllFileType = {
  pk: 'Workspace0002BBBB',
  sk: 'Document0003CCCC',
  type: 'Document',
  data: {
    title: 'This is a document',
    dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
    dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
  }
}

export const DocumentData: DocumentItemType[] = [
  {
    pk: 'Document0003CCC',
    sk: 'Equation1',
    type: 'equation',
    data: {
      text: '1+1',
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)'
    }
  }
]
