import type Anthropic from "@anthropic-ai/sdk";
import rawMaterials from "../data/material.json";

// The part agent's tools. Internal to the build — never offered to the chat model. The part agent
// works in two stages: the calculation stage uses write_calculation and lookup_material; the
// writing stage uses write_document.
export const WRITE_CALCULATION_TOOL_NAME = "write_calculation";
export const WRITE_DOCUMENT_TOOL_NAME = "write_document";
export const LOOKUP_MATERIAL_TOOL_NAME = "lookup_material";

export const STEP_ROLES = ["given", "choice", "calculation", "check", "output"] as const;
export type StepRole = (typeof STEP_ROLES)[number];

export interface PartImportInput {
  sourceFileId: number;
  sourceVariableName: string;
  localAlias?: string;
}

export interface CalculationStepInput {
  raw: string;
  role: StepRole;
  why: string;
  positive: boolean;
}

export interface WriteCalculationInput {
  steps: CalculationStepInput[];
  imports?: PartImportInput[];
}

export interface DocumentBlockInput {
  type: "header" | "text" | "equation";
  text?: string;
  level?: number;
  /** equation only: the number of the calculation step to show here. */
  step?: number;
}

export interface WriteDocumentInput {
  blocks: DocumentBlockInput[];
}

export const WRITE_CALCULATION_TOOL: Anthropic.Tool = {
  name: WRITE_CALCULATION_TOOL_NAME,
  description:
    "Write the part's calculation: its equations in order, each with its role and the reason for it, and the variables it imports. The equations are solved and the results, errors and failed checks are returned. If anything is wrong, fix it and call this again with the whole calculation. When nothing is wrong the calculation is accepted and you are done. Do not write headings or prose here.",
  input_schema: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        description: "The whole calculation, one equation per step, in the order they must be solved.",
        items: {
          type: "object",
          properties: {
            raw: { type: "string", description: "`name = expression` in the platform's syntax." },
            role: {
              type: "string",
              enum: [...STEP_ROLES],
              description:
                "given: a value the design needs that is not imported (a stated input, or an assumption). choice: a design decision such as a material, a size or a count. calculation: a value worked out from earlier steps. check: a pass/fail test against a requirement; the equation must give 1 when the requirement is met and 0 when it is not. output: a value other parts import, named exactly as in the Interfaces section.",
            },
            why: {
              type: "string",
              description:
                "One or two plain sentences giving the reason, the way an engineer would explain it to a colleague. For a given: where it comes from, or that it is an assumption to be checked. For a choice: why this one. For a check: which requirement it tests.",
            },
            positive: {
              type: "boolean",
              description:
                "True if the result must be greater than zero: a size, area, length, mass, strength, safety factor or count. False for quantities that can be zero or negative, such as a coordinate difference or a force direction.",
            },
          },
          required: ["raw", "role", "why", "positive"],
        },
      },
      imports: {
        type: "array",
        description:
          "Variables to bring in from the list of available imports in the request. Use the imported name directly in equations; do not declare it again. Empty if none.",
        items: {
          type: "object",
          properties: {
            sourceFileId: { type: "number", description: "The source id exactly as listed." },
            sourceVariableName: { type: "string", description: "The variable name exactly as listed." },
            localAlias: { type: "string", description: "The name to use here. Defaults to the source name." },
          },
          required: ["sourceFileId", "sourceVariableName"],
        },
      },
    },
    required: ["steps"],
  },
};

export const WRITE_DOCUMENT_TOOL: Anthropic.Tool = {
  name: WRITE_DOCUMENT_TOOL_NAME,
  description:
    "Write the part's document: headings and text, with each solved calculation step placed once as an equation block. If something is wrong the problems are returned; fix them and call this again with the whole document.",
  input_schema: {
    type: "object",
    properties: {
      blocks: {
        type: "array",
        description: "The whole document, in display order.",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["header", "text", "equation"] },
            text: { type: "string", description: "header: the heading. text: plain prose (no HTML or markdown); a blank line starts a new paragraph." },
            level: { type: "number", description: "header only: 1-4. Default 2." },
            step: { type: "number", description: "equation only: the number of the calculation step to show here, as listed." },
          },
          required: ["type"],
        },
      },
    },
    required: ["blocks"],
  },
};

export const LOOKUP_MATERIAL_TOOL: Anthropic.Tool = {
  name: LOOKUP_MATERIAL_TOOL_NAME,
  description:
    "Look up the platform's built-in material properties (strength, modulus). Each property is a named constant that can be used directly in an equation, such as A36_Fy. Search by material, grade or category, e.g. \"titanium\", \"6061\", \"steel\". An empty query lists the materials available. If the material you need isn't there, say so in the document rather than inventing a value.",
  input_schema: {
    type: "object",
    properties: { query: { type: "string", description: "Words to match against material, grade, category or constant name. May be empty." } },
    required: ["query"],
  },
};

interface MaterialRow {
  material: string;
  category: string;
  grade: string;
  property: string;
  value: number;
  units: string;
  name: string;
  source: string;
}

const MAX_MATERIAL_ROWS = 60;

export function lookupMaterial(query: string): string {
  const rows = rawMaterials as MaterialRow[];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    const seen = new Map<string, string>();
    for (const r of rows) if (!seen.has(r.material)) seen.set(r.material, `${r.material} (${r.category}, ${r.grade})`);
    return `Materials available:\n${[...seen.values()].join("\n")}`;
  }

  const matches = rows.filter((r) => {
    const hay = `${r.material} ${r.category} ${r.grade} ${r.name} ${r.property}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  if (matches.length === 0) {
    return `No built-in material matches "${query}". Do not invent properties; say in the document that they are not available.`;
  }
  const shown = matches.slice(0, MAX_MATERIAL_ROWS);
  return [
    ...shown.map((r) => `${r.name} = ${r.value} ${r.units} — ${r.material} (${r.grade}) ${r.property.replace(/_/g, " ")}; source: ${r.source}`),
    matches.length > shown.length ? `(${matches.length - shown.length} more — narrow the query)` : "",
  ].filter(Boolean).join("\n");
}
