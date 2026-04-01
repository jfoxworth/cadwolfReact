import type { Item } from "./item";

export type BlockType =
  | "TEXT"
  | "HEADER"
  | "EQUATION"
  | "SYMBOLIC_EQUATION"
  | "SLIDER"
  | "SELECT_BLOCK"
  | "DROPDOWN"
  | "FOR_LOOP"
  | "IF_ELSE"
  | "WHILE_LOOP"
  | "CARD"
  | "IMAGE"
  | "VIDEO"
  | "LINE_BREAK"
  | "PLOT";

export interface Block {
  id: string;
  refId: string;
  type: BlockType;
  order: number;
  name?: string;
  definition: Record<string, unknown>;
  solution?: Record<string, unknown>;
}

/** Status of a block in the local virtual DOM — never persisted to DB. */
export type BlockStatus = "clean" | "new" | "modified" | "deleted";

/** In-memory copy of a Block with a mutation status flag. */
export interface VirtualBlock extends Block {
  _status: BlockStatus;
  /** True while the solver worker is actively solving this block. Never persisted. */
  _solving?: boolean;
}

// Combined result of the two queries made when a document page loads:
//   1. Fetch the document entity by id (Item with type "DOCUMENT")
//   2. Fetch all blocks whose parentId matches the document id

export interface BibliographyEntry {
  id:      number;
  authors: string;
  title:   string;
  year:    number | null;
  source:  string | null;
  url:     string | null;
  doi:     string | null;
  note:    string | null;
  order:   number;
}

export interface FileImportEntry {
  id:                 number;
  sourceFileId:       number;
  sourceFileName:     string;
  sourceFileSlug:     string | null;
  sourceVariableName: string;
  localAlias:         string;
  value:              string | null;
  units:              string | null;
  needsUpdate:        boolean;
  order:              number;
}

export interface DatasetImportEntry {
  id:             number;
  datasetId:      number;
  datasetName:    string;
  localAlias:     string;
  cachedValues:   string | null;
  datapointCount: number;
  needsUpdate:    boolean;
  order:          number;
}

export interface DocumentPageData {
  document:       Item;
  blocks:         Block[];
  bibliographies: BibliographyEntry[];
  fileImports:    FileImportEntry[];
  datasetImports: DatasetImportEntry[];
}
