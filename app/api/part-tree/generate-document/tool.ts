import type Anthropic from "@anthropic-ai/sdk";

// Internal-only — never offered to the conversational chat model (app/api/chat/tools.ts).
// Used solely by this route's own single, forced-tool-choice call, one per document, during
// Build mode's Stage 6 content-generation pass. v1 supports only the four block kinds listed
// below — no if/else, slider, dropdown, plot, or image generation yet.
export const GENERATE_DOCUMENT_CONTENT_TOOL_NAME = "propose_document_content";

export const GENERATE_DOCUMENT_CONTENT_TOOL: Anthropic.Tool = {
  name: GENERATE_DOCUMENT_CONTENT_TOOL_NAME,
  description:
    "Propose the real content for this one document: an ordered list of blocks, and (for a physical part only, never a requirements document) which already-solved requirements-document variables it should import. This is the only output expected — do not explain yourself in prose.",
  input_schema: {
    type: "object",
    properties: {
      blocks: {
        type: "array",
        description: "The document's content, in display order. At least one block.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["header", "text", "equation", "symbolic_equation"],
              description: "Block kind.",
            },
            text: {
              type: "string",
              description: "For \"header\" (heading text) and \"text\" (plain prose, may include simple HTML like <p>/<b>) blocks.",
            },
            level: {
              type: "number",
              description: "For \"header\" blocks only — heading level, 1-4. Defaults to 2 if omitted.",
            },
            raw: {
              type: "string",
              description: "For \"equation\" blocks only — a full equation string in CadWolf syntax, e.g. \"P_cr = (pi^2 * E * I) / (L^2) [lbf]\". See the system prompt for syntax rules.",
            },
            expression: {
              type: "string",
              description: "For \"symbolic_equation\" blocks only — a LaTeX expression string.",
            },
          },
          required: ["type"],
        },
      },
      imports: {
        type: "array",
        description: "Only meaningful for a physical part (never set this for a requirements document). Variables this document's equations should import from the requirements documents listed in the system prompt as available. Omit or leave empty if nothing applies.",
        items: {
          type: "object",
          properties: {
            sourceFileId: {
              type: "number",
              description: "The id of the requirements document to import from — must be one of the ids explicitly listed as available in the system prompt, never a guessed or remembered id.",
            },
            sourceVariableName: {
              type: "string",
              description: "The exact variable name as listed for that requirements document — must match one actually listed, never invented.",
            },
            localAlias: {
              type: "string",
              description: "The name this document's own equations will use for the imported value. Defaults to sourceVariableName if omitted.",
            },
          },
          required: ["sourceFileId", "sourceVariableName"],
        },
      },
    },
    required: ["blocks"],
  },
};
