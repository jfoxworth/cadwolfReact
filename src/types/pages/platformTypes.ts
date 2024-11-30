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
