// ─── Item Types ──────────────────────────────────────────────────────────────

export type ItemType =
  | "WORKSPACE"
  | "FOLDER"
  | "DOCUMENT"
  | "DATASET"
  | "PART_TREE"
  | "IMAGE";

// ─── Base Item ────────────────────────────────────────────────────────────────
// Shared shape for any item that can live inside a workspace or folder.
// The `type` field distinguishes what page/view it routes to.

export type SolverLocation = "browser" | "python" | "server";

export interface TocSettings {
  show: boolean;
  maxLevel: 1 | 2 | 3 | 4 | 5;
}

export interface FunctionPort {
  variableName: string;
  description:  string;
  unit:         string;
}

export interface FunctionSettings {
  inputs:  FunctionPort[];
  outputs: FunctionPort[];
}

export interface ImportedFunction {
  sourceFileId:   number;
  sourceFileName: string;
  localAlias:     string;
  inputs:         FunctionPort[];
  outputs:        FunctionPort[];
}

export type PermLevel = "view" | "edit" | "admin";
export type PermMode = "everyone" | "inherit" | "list";

export interface ItemPermission {
  userId: string;
  email: string;
  role: "owner" | "edit" | "view";
}

export interface Item {
  id: string;
  slug: string;
  type: ItemType;
  name: string;
  description?: string;
  parentId: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  // Type-specific optional fields
  ownerId?: string;        // WORKSPACE
  version?: number;        // DOCUMENT
  width?: number;          // DOCUMENT — content max-width in px (default 825)
  solver?: SolverLocation; // DOCUMENT — where equations are evaluated
  permissions?: ItemPermission[]; // DOCUMENT — access control list
  toc?: TocSettings;              // DOCUMENT — table of contents config
  functionSettings?: FunctionSettings; // DOCUMENT — input/output interface
  importedFunctions?: ImportedFunction[]; // DOCUMENT — functions imported from other docs
  quantity?: number;                      // DOCUMENT — number of this part in the assembly
  needsUpdate?: boolean;                  // DOCUMENT — source imports have changed since last solve
  importedCad?: Array<{ eqname: string; partName?: string; properties?: Record<string, number> }>; // DOCUMENT — legacy CAD parts pulled from item_data
  importedCadFetchedAt?: string; // DOCUMENT — ISO timestamp of last live CAD properties fetch
  fileImage?: string; // URL or relative S3 path for the item's thumbnail image
  lockedBy?: number | null;   // DOCUMENT/DATASET — userId of the user who has it checked out
  lockedAt?: string | null;   // ISO timestamp of when it was checked out
  order?: number;             // display order within parent workspace/folder
  isAnalysis?: boolean;       // DOCUMENT — marks a document as an analysis/calculation (not a physical part)
}
