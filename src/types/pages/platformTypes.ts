// The data object within files - workspaces, documents, datasets, part trees
export type FileData = {
  title: string
  dateCreated: string
  dateLastUpdated: string
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

// The data object within document items - equation, text, chart, etc
export type DocumentItemData = {
  text: string
  headerLevel?: number
  width: number | null
  dateCreated: string
  dateLastUpdated: string
}

// Document items - equation, text, chart, etc
export type DocumentItemType = {
  pk: string
  sk: string
  type: string
  data: DocumentItemData
}
