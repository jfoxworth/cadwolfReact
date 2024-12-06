import type { AllFileType } from '@/types/pages/platformTypes'
import type { DocumentItemType } from '@/types/pages/platformTypes'

export const DocumentFile: AllFileType = {
  pk: 'Workspace0002BBBB',
  sk: 'Document0003CCCC',
  type: 'Document',
  data: {
    title: 'This is a document',
    dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
    dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
    width: '850px'
  }
}

export const DocumentData: DocumentItemType[] = [
  {
    pk: 'Document0003CCC',
    sk: 'Header1',
    type: 'header',
    data: {
      text: 'This is my header',
      headerLevel: 1,
      width: null,
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      xMargin: '0',
      yMargin: '1em'
    }
  },
  {
    pk: 'Document0003CCC',
    sk: 'Text1',
    type: 'text',
    data: {
      text: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>',
      width: null,
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      xMargin: '0',
      yMargin: '1em'
    }
  },
  {
    pk: 'Document0003CCC',
    sk: 'Equation1',
    type: 'equation',
    data: {
      text: '1+1',
      width: null,
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      xMargin: '0',
      yMargin: '1em'
    }
  },
  {
    pk: 'Document0003CCC',
    sk: 'SymbolicEquation1',
    type: 'symbolicequation',
    data: {
      text: '\\frac{3}{2}',
      width: null,
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      xMargin: '0',
      yMargin: '1em'
    }
  },
  {
    pk: 'Document0003CCC',
    sk: 'Slider1',
    type: 'slider',
    data: {
      text: '',
      width: null,
      dateCreated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      dateLastUpdated: 'Sat Nov 30 2024 10:39:56 GMT-0600 (Central Standard Time)',
      xMargin: '0',
      yMargin: '1em',
      slider: {
        minValue: 0,
        maxValue: 20,
        value: 10,
        discrete: true,
        stepIncrement: 1,
        labels: true,
        orientation: 'horizontal',
        track: false,
        customMarks: []
      }
    }
  }
]
