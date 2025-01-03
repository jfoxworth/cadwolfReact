// The data object within files - workspaces, documents, datasets, part trees
export type FileData = {
  title: string
  description: string
  dateCreated: string
  dateLastUpdated: string
  width?: string // Documents have an overall width
}

// The type for all platform files - workspaces, documents, datasets, part trees
export type AllFileType = {
  pk: string
  sk: string
  type: string
  data: FileData
}

// The file that contains the heirarchy data for a file
export type HeirarchyType = {
  pk: string | null
  sk: string
  type: string
  data: FileData
}

export type SliderObjectType = {
  minValue: number
  maxValue: number
  value: number
  discrete: boolean
  stepIncrement: number
  labels: boolean
  orientation: string
  track: boolean
  customMarks: []
}

// The data object within document items - equation, text, chart, etc
export type DocumentItemData = {
  text: string
  headerLevel?: number
  width: number | null
  xMargin: string
  yMargin: string
  dateCreated: string
  dateLastUpdated: string
  slider?: SliderObjectType
}

// Document items - equation, text, chart, etc
export type DocumentItemType = {
  pk: string
  sk: string
  type: string
  data: DocumentItemData
}
