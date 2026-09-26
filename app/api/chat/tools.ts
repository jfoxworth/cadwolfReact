import type Anthropic from "@anthropic-ai/sdk";

// Shared by every block tool: how to target an existing block (edit) vs. where to
// insert a new one (add). Presence/absence of targetBlockId is what distinguishes
// an edit from an add — there's no separate "add" vs "edit" tool per block type.
const targeting = {
  targetBlockId: {
    type: "string",
    description:
      "ID of an existing block to edit. Omit this to insert a new block instead of editing one.",
  },
  anchorBlockId: {
    type: "string",
    description:
      "Only used when targetBlockId is omitted (inserting a new block): the block to position the new one relative to, combined with `position`. If the user has a block selected, use that block's id here — do not leave this out just because they said \"add this below/above\" without repeating the id; the selected block's id is the anchor. Omit only when there's genuinely no relevant block to anchor to (e.g. a document-wide request with nothing selected), which inserts at the end of the document.",
  },
  position: {
    type: "string",
    enum: ["before", "after"],
    description:
      "Whether the new block goes before or after anchorBlockId. Defaults to \"after\". Ignored if anchorBlockId is omitted.",
  },
} as const;

// None of these tools write to the document directly. Each one produces a proposal
// that's shown to the user (highlighted on the canvas for edits, as a card in chat
// for new blocks) — the user must explicitly approve it before anything is saved.
export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "equation_block",
    description:
      "Propose adding a new equation block, or editing an existing one, in the current document. An equation block defines or computes a variable using CadWolf's equation syntax: \"variableName = expression\", with units in square brackets where applicable (e.g. \"F = 500 [N]\"). Does not save automatically — the user must approve the proposal.",
    input_schema: {
      type: "object",
      properties: {
        raw: {
          type: "string",
          description: "The full equation in CadWolf syntax, e.g. \"x = a + b\" or \"F = 500 [N]\".",
        },
        ...targeting,
      },
      required: ["raw"],
    },
  },
  {
    name: "symbolic_equation_block",
    description:
      "Propose adding a new symbolic equation block, or editing an existing one. A symbolic equation block displays a LaTeX expression without solving it numerically — used for formulas, derivations, or reference equations. Does not save automatically — the user must approve the proposal.",
    input_schema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "LaTeX expression, e.g. \"F = m \\\\cdot a\".",
        },
        ...targeting,
      },
      required: ["expression"],
    },
  },
  {
    name: "text_block",
    description:
      "Propose adding a new text block, or editing an existing one. A text block holds explanatory prose. Does not save automatically — the user must approve the proposal.",
    input_schema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text content, in plain text or simple HTML.",
        },
        ...targeting,
      },
      required: ["text"],
    },
  },
  {
    name: "header_block",
    description:
      "Propose adding a new header block, or editing an existing one. A header block marks a section title. Does not save automatically — the user must approve the proposal.",
    input_schema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The heading text.",
        },
        level: {
          type: "integer",
          description: "Heading level, 1 (largest) through 6. Defaults to 2 if omitted.",
        },
        ...targeting,
      },
      required: ["text"],
    },
  },
  {
    name: "if_else_block",
    description:
      "Propose adding a new if/else block, or editing an existing one. An if/else block runs a set of equations only when a condition holds, with optional \"else if\"/\"else\" branches. Structural rules: branches must start with exactly one \"if\" branch; any number of \"else if\" branches may follow; at most one \"else\" branch is allowed, and it must be last. Does not save automatically — the user must approve the proposal.",
    input_schema: {
      type: "object",
      properties: {
        branches: {
          type: "array",
          description: "Ordered list of branches, following the structural rules above.",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["if", "elseif", "else"] },
              conditions: {
                type: "array",
                description: "Required for \"if\"/\"elseif\" branches, omitted for \"else\". Multiple entries are combined via each entry's own blockOption.",
                items: {
                  type: "object",
                  properties: {
                    flagText: { type: "string", description: "Left-hand side expression, e.g. a variable name." },
                    conditionText: { type: "string", enum: ["==", "!=", ">", ">=", "<", "<="] },
                    dependentText: { type: "string", description: "Right-hand side expression." },
                    blockOption: { type: "string", enum: ["&&", "||"], description: "How this condition combines with the next one in the list. Value on the last condition is unused." },
                  },
                  required: ["flagText", "conditionText", "dependentText", "blockOption"],
                },
              },
              equations: {
                type: "array",
                description: "Raw equations to run when this branch is active, in CadWolf syntax (same as equation_block's `raw`), one per array entry.",
                items: { type: "string" },
              },
            },
            required: ["type", "equations"],
          },
        },
        ...targeting,
      },
      required: ["branches"],
    },
  },
];

// Unlike the document block tools, none of these have anything to anchor to (no selection
// concept on a workspace page), and once approved, none are a local draft — each calls the
// real /api/file route immediately, the same as the existing UI actions they mirror
// (the "New" button, the row's slide-out menu's Edit Title/Move Item/Delete Item).
export const WORKSPACE_TOOLS: Anthropic.Tool[] = [
  {
    name: "create_file",
    description:
      "Propose creating a new file in the current workspace/folder: a Document, a Dataset, or a nested folder (fileTypeId \"Workspace\"). Approving this creates the file for real immediately — there's no separate Save step for a workspace's file list. Does not create a root workspace, and does not support part trees — say so plainly if asked for one.",
    input_schema: {
      type: "object",
      properties: {
        fileTypeId: {
          type: "string",
          enum: ["Document", "Dataset", "Workspace"],
          description: "\"Workspace\" here creates a nested folder inside the current one, not a new root workspace.",
        },
        name: {
          type: "string",
          description:
            "Name for the new file. If the user didn't specify one, omit this — a default name will be generated, matching the existing \"New\" button's behavior.",
        },
      },
      required: ["fileTypeId"],
    },
  },
  {
    name: "rename_file",
    description: "Propose renaming an item in the current workspace. targetId must be an id from the current item listing — never invent one.",
    input_schema: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "id of the item to rename, from the current workspace listing." },
        name: { type: "string", description: "The new name." },
      },
      required: ["targetId", "name"],
    },
  },
  {
    name: "move_file",
    description:
      "Propose moving an item into a nested folder within the current workspace. Both targetId and destinationId must be ids from the current item listing — you have no visibility into workspaces/folders beyond this one, so never invent or guess an id for a destination the user hasn't shown you. destinationId must refer to a WORKSPACE-typed item (a nested folder) in that same listing.",
    input_schema: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "id of the item to move, from the current workspace listing." },
        destinationId: { type: "string", description: "id of the destination folder (a WORKSPACE-typed item) from the current workspace listing." },
      },
      required: ["targetId", "destinationId"],
    },
  },
  {
    name: "delete_file",
    description:
      "Propose deleting an item from the current workspace. targetId must be an id from the current item listing. This requires admin permission, not just edit, and if the target is a WORKSPACE-typed item (a nested folder), deleting it deletes everything inside it too — before calling this tool, say so plainly to the user in your message so the deletion they're approving is fully informed, don't just silently propose it.",
    input_schema: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "id of the item to delete, from the current workspace listing." },
      },
      required: ["targetId"],
    },
  },
];

// Part-tree items are all File rows in one nested-set tree (no JSON blob) — a "subsystem" is
// fileTypeId "Workspace", a "part" is fileTypeId "Document", and a "requirements document" is
// simply a Document with isAnalysis=true (excluded from mass/rollup math, its equations meant to
// be imported by other documents as variables via the existing cross-document import mechanism —
// not modeled by these tools directly). Same apply model as WORKSPACE_TOOLS: each of these calls
// the real /api/file route immediately on approval, no local draft/Save step. Reuses the same
// tool names as WORKSPACE_TOOLS on purpose (see getPartTreeTools below) so the client-side
// rendering code (ProposalToolName, PROPOSAL_LABELS, proposalPreview) needs no changes.
export const PART_TREE_TOOLS: Anthropic.Tool[] = [
  {
    name: "create_file",
    description:
      "Propose creating a new part (fileTypeId \"Document\") or subsystem (fileTypeId \"Workspace\") in the current part tree. Approving this creates it for real immediately. Does not support creating a nested part tree.",
    input_schema: {
      type: "object",
      properties: {
        fileTypeId: {
          type: "string",
          enum: ["Document", "Workspace"],
          description: "\"Document\" creates a part (or, with isRequirementsDocument, a requirements document). \"Workspace\" creates a subsystem.",
        },
        name: {
          type: "string",
          description: "Name for the new item. If the user didn't specify one, omit this — a default name will be generated.",
        },
        parentId: {
          type: "string",
          description: "id of the subsystem to create this inside, from the current part tree listing. Omit to create at the top level (directly under the part tree root).",
        },
        isRequirementsDocument: {
          type: "boolean",
          description: "Only meaningful when fileTypeId is \"Document\". Set true to create it as a requirements document (marked isAnalysis — excluded from mass/quantity rollups, meant to hold equations other parts import as variables) rather than a physical part. Omit or set false for an ordinary part.",
        },
      },
      required: ["fileTypeId"],
    },
  },
  {
    name: "rename_file",
    description: "Propose renaming a part, subsystem, or requirements document in the current part tree. targetId must be an id from the current tree listing — never invent one.",
    input_schema: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "id of the item to rename, from the current part tree listing." },
        name: { type: "string", description: "The new name." },
      },
      required: ["targetId", "name"],
    },
  },
  {
    name: "move_file",
    description:
      "Propose moving a part, subsystem, or requirements document to a new place in the current part tree. Both targetId and destinationId must be ids from the current tree listing — never invent or guess one. destinationId must be either a subsystem (WORKSPACE-typed item) from that listing, or the part tree's own root id (from the page content given to you) to move it to the top level.",
    input_schema: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "id of the item to move, from the current part tree listing." },
        destinationId: { type: "string", description: "id of the destination subsystem, or the part tree root's own id, from the current part tree listing/context." },
      },
      required: ["targetId", "destinationId"],
    },
  },
  {
    name: "delete_file",
    description:
      "Propose deleting a part, subsystem, or requirements document from the current part tree. targetId must be an id from the current tree listing. This requires admin permission, not just edit. If the target is a subsystem containing other parts/subsystems, deleting it deletes everything inside it too — before calling this tool, say so plainly to the user in your message so the deletion they're approving is fully informed, don't just silently propose it.",
    input_schema: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "id of the item to delete, from the current part tree listing." },
      },
      required: ["targetId"],
    },
  },
];

// Unlike every other page type, part-tree's tool availability depends on `mode`: Overview and
// Inspect are intentionally read-only (real enforcement, not just a prompt hint — the model
// simply isn't given the mutating tools in those modes), and only Build mode gets them.
// search_documents and read_document stay available in every mode since they're lookups, not
// mutations — Overview/Inspect's restriction is about changing the tree, not looking things up.
export function getPartTreeTools(mode: string | undefined): Anthropic.Tool[] {
  const readOnly = [SEARCH_TOOL, READ_DOCUMENT_TOOL, READ_PART_TREE_TOOL, FIND_SIMILAR_PART_TREES_TOOL];
  return mode === "build" ? [...PART_TREE_TOOLS, ...readOnly] : readOnly;
}

// These three tools follow two different apply models, matching what each field already
// does in the existing UI: configure_dataset_parsers and edit_dataset_content only ever
// update DatasetEdit.tsx's own local state (no API call — the page's Save button is still
// required), the same as the Settings/Input tabs' own edits; edit_dataset_metadata applies
// for real immediately, matching the existing title/description modals' own Save behavior.
export const DATASET_TOOLS: Anthropic.Tool[] = [
  {
    name: "configure_dataset_parsers",
    description:
      "Propose a parser configuration for the current dataset — how its raw text is split into rows/columns/etc. Use this when a user wants their data structured a certain way but doesn't know how to set up the separators themselves, or when the existing parsers clearly don't match the data shown. Approving this updates what's shown on the page (the Settings and Results tabs) immediately, but does NOT save it — make sure the user knows they still need to click the page's own Save button to keep it.",
    input_schema: {
      type: "object",
      properties: {
        parsers: {
          type: "array",
          description:
            "Ordered list of parsers, innermost dimension (individual values) first, outermost (rows/blocks) last — same order convention as the Settings tab.",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Human-readable label, e.g. \"Row\", \"Column\"." },
              separator: {
                type: "string",
                description: "Separator string, using escape sequences like \\n or \\t where applicable — same format the Settings tab's own input uses.",
              },
            },
            required: ["label", "separator"],
          },
        },
      },
      required: ["parsers"],
    },
  },
  {
    name: "edit_dataset_content",
    description:
      "Propose replacing the ENTIRE raw content of the current dataset — there's no smaller edit primitive; this matches the Input tab's own textarea, which always replaces the whole thing. Approving this updates the page (switches to the Results tab) immediately but does NOT save it — the user still has to click the page's own Save button. IMPORTANT: your context only ever shows a bounded preview of this dataset (the first several rows). If the dataset has more rows than that (you'll see \"…and N more rows\"), do NOT compose a replacement by combining what you can see with something new — you would silently discard every row you can't see. Only use this tool when the user wants to replace the data outright, or when the entire dataset is already visible to you with no overflow. Otherwise, say plainly that you can only see part of the data and can't safely do this, and point to the Input tab.",
    input_schema: {
      type: "object",
      properties: {
        rawText: { type: "string", description: "The complete new raw text content, replacing what's there now." },
      },
      required: ["rawText"],
    },
  },
  {
    name: "edit_dataset_metadata",
    description:
      "Propose changing the current dataset's title and/or description. Unlike the other dataset tools, this applies for real immediately on approval, matching the existing Edit Title/Edit Description actions — there's no separate Save step for these two fields specifically.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "New title. Omit to leave unchanged." },
        description: { type: "string", description: "New description. Omit to leave unchanged." },
      },
    },
  },
];

// Unlike every tool above, there's nothing for the client to apply here — it's information
// the model needs, not a proposal. app/api/chat/route.ts recognizes this name specifically
// and executes it server-side (embeds the query, runs a permission-filtered similarity search
// via utils/searchEmbeddings.ts, feeds the result back to the model as a tool_result within
// the same turn) — it's never forwarded to the client as a tool_use event the way every other
// tool is.
export const SEARCH_TOOL_NAME = "search_documents";

export const SEARCH_TOOL: Anthropic.Tool = {
  name: SEARCH_TOOL_NAME,
  description:
    "Search across every document the user can access — not just the current page's content already in your context. Use this for requests like \"which document talks about X\", \"what did I write about Y\", or anything that needs finding relevant content you don't already have in front of you. Returns the best-matching pieces of content found, each labeled with which document it came from. If nothing relevant is found, say so plainly rather than guessing.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "A natural-language description of what to search for.",
      },
    },
    required: ["query"],
  },
};

// Also server-executed like search_documents, never forwarded as a client-applied proposal —
// app/api/chat/route.ts special-cases both names the same way. Backed by
// utils/readDocument.ts's readDocumentForChat, which never throws (permission/not-found cases
// come back as a plain string the model can relay).
export const READ_DOCUMENT_TOOL_NAME = "read_document";

export const READ_DOCUMENT_TOOL: Anthropic.Tool = {
  name: READ_DOCUMENT_TOOL_NAME,
  description:
    "Read a specific document's actual equations/content, plus what it imports from other documents. Use this whenever you need the real values behind an id you already have — e.g. a requirements document referenced by a part's import, to answer what that part actually needs to satisfy. Don't guess or assume content; call this to see it. Only takes an id already visible to you (from the part tree listing, a selection, or a prior tool result) — never invent one.",
  input_schema: {
    type: "object",
    properties: {
      fileId: {
        type: "string",
        description: "id of the document to read, from context already given to you.",
      },
    },
    required: ["fileId"],
  },
};

// Also server-executed, same treatment as SEARCH_TOOL/READ_DOCUMENT_TOOL above.
export const READ_PART_TREE_TOOL_NAME = "read_part_tree";

export const READ_PART_TREE_TOOL: Anthropic.Tool = {
  name: READ_PART_TREE_TOOL_NAME,
  description:
    "Read a specific OTHER part tree's full structure (subsystems, parts, quantities, and which parts import from which requirements documents) — the same kind of detail you have for the current page, for a different tree by id. Use this to compare an existing candidate's actual composition against what's being proposed, when name/description alone aren't conclusive. Only takes an id already visible to you (e.g. from find_similar_part_trees) — never invent one.",
  input_schema: {
    type: "object",
    properties: {
      fileId: {
        type: "string",
        description: "id of the part tree root to read, from a prior find_similar_part_trees result or other context.",
      },
    },
    required: ["fileId"],
  },
};

export const FIND_SIMILAR_PART_TREES_TOOL_NAME = "find_similar_part_trees";

export const FIND_SIMILAR_PART_TREES_TOOL: Anthropic.Tool = {
  name: FIND_SIMILAR_PART_TREES_TOOL_NAME,
  description:
    "Find existing part trees structurally/semantically similar to a description of a proposed new system, ranked by similarity — not just name matching. Use this before proposing a new structure from scratch, so the build can start from (or explicitly diverge from) something that already exists.",
  input_schema: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "A description of the system being proposed, to compare against existing part trees.",
      },
    },
    required: ["description"],
  },
};

export type ProposalToolName =
  | "equation_block"
  | "symbolic_equation_block"
  | "text_block"
  | "header_block"
  | "if_else_block"
  | "create_file"
  | "rename_file"
  | "move_file"
  | "delete_file"
  | "configure_dataset_parsers"
  | "edit_dataset_content"
  | "edit_dataset_metadata";

// Which tools are offered depends on what page type the request came from — Document,
// Workspace, Dataset, and now Part Tree pages all have something wired up to act on a tool call
// (documentWrapper.tsx's, WorkspaceEdit.tsx's, DatasetEdit.tsx's, and PartTreeWrapper.tsx's
// proposal handlers, respectively). search_documents is additive on top of each page's own
// tools, not a replacement. Part-tree isn't listed here — its tool set also depends on `mode`,
// see getPartTreeTools above; app/api/chat/route.ts branches on pageType to call it instead of
// indexing into this map for that one page type.
export const TOOLS_BY_PAGE_TYPE: Record<string, Anthropic.Tool[]> = {
  document: [...CHAT_TOOLS, SEARCH_TOOL],
  dataset: DATASET_TOOLS,
  workspace: [...WORKSPACE_TOOLS, SEARCH_TOOL],
};
