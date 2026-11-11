// The five focused passes a coordinator makes, each with its own small tool, and the checks that
// run on each answer before the next pass sees it. The model decides; this code verifies that
// what it returned refers to things that exist (requirement ids it was shown, children it listed).
// Prompts: prompts/agents/coordinator.md plus prompts/agents/passes/<pass>.md.
import type Anthropic from "@anthropic-ai/sdk";
import type {
  DesignChild, DesignInterface, DesignNote, DesignRequirement, RequirementScope,
} from "./designDocumentFormat";
import type { RequirementKind } from "./gatherRequirements";

/** A requirement a pass may cite: handed down from above or flagged in the system's own documents. */
export interface RequirementInput {
  id: number;
  source: string;
  kind: RequirementKind;
  text: string;
}

export const PASS_NAMES = ["structure", "requirements", "interfaces", "details", "orientation"] as const;
export type PassName = (typeof PASS_NAMES)[number];

const lc = (s: string) => s.trim().toLowerCase();

// ---- Tools -------------------------------------------------------------------------------------

const QUESTIONS = {
  type: "array",
  items: { type: "string" },
  description: "Anything this pass needs that the documents and request leave undecided. Empty if none. Do not guess instead.",
} as const;

export const STRUCTURE_TOOL: Anthropic.Tool = {
  name: "report_structure",
  description: "Report the systems and parts directly beneath this one. This is the only output expected.",
  input_schema: {
    type: "object",
    properties: {
      children: {
        type: "array",
        description: "The systems and parts directly beneath, and nothing deeper, in the order they must be designed (an item after everything it needs). Keep any that already exist.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short unique name. The existing name if it is already in the part tree." },
            kind: { type: "string", enum: ["system", "part"], description: "A system contains other items; a part is a single designed component." },
            count: { type: "number", description: "How many identical instances there are. 1 if one." },
            purpose: { type: "string", description: "What it is for, in one sentence." },
          },
          required: ["name", "kind", "count", "purpose"],
        },
      },
      openQuestions: QUESTIONS,
    },
    required: ["children", "openQuestions"],
  },
};

export const REQUIREMENTS_TOOL: Anthropic.Tool = {
  name: "assign_requirements",
  description: "Say who each requirement applies to. This is the only output expected.",
  input_schema: {
    type: "object",
    properties: {
      assignments: {
        type: "array",
        description: "One entry for every requirement id you were given, each exactly once.",
        items: {
          type: "object",
          properties: {
            id: { type: "number" },
            scope: {
              type: "string",
              enum: ["all", "system", "children"],
              description: "all: this system and everything beneath it. system: this system as a whole, not passed down. children: only the children named in `children`.",
            },
            children: {
              type: "array",
              items: { type: "string" },
              description: "For scope children: the names of the children it applies to, exactly as listed. Empty otherwise.",
            },
          },
          required: ["id", "scope", "children"],
        },
      },
      openQuestions: QUESTIONS,
    },
    required: ["assignments", "openQuestions"],
  },
};

export const INTERFACES_TOOL: Anthropic.Tool = {
  name: "report_interfaces",
  description: "Report what each child needs from elsewhere and what it must give. This is the only output expected.",
  input_schema: {
    type: "object",
    properties: {
      interfaces: {
        type: "array",
        description: "One entry per child.",
        items: {
          type: "object",
          properties: {
            node: { type: "string", description: "The child's name, exactly as listed." },
            inputs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "A variable-style name: letters, digits and underscores, starting with a letter (loadPerStrut)." },
                  from: { type: "string", description: "A sibling's name that provides it, `above` if the design above hands it to this system, or `requirement N` if a requirement sets it." },
                  note: { type: "string", description: "What it is, with its unit if the documents give one." },
                },
                required: ["name", "from", "note"],
              },
            },
            outputs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "A variable-style name." },
                  note: { type: "string", description: "What it is and who needs it." },
                },
                required: ["name", "note"],
              },
            },
          },
          required: ["node", "inputs", "outputs"],
        },
      },
      openQuestions: QUESTIONS,
    },
    required: ["interfaces", "openQuestions"],
  },
};

export const DETAILS_TOOL: Anthropic.Tool = {
  name: "report_details",
  description: "Report the given parameters and the design intent the documents state. This is the only output expected.",
  input_schema: {
    type: "object",
    properties: {
      given: {
        type: "array",
        description: "Specific values and facts the documents state for a child or the system: loads, dimensions, materials, quantities, coordinates. Only what is stated.",
        items: {
          type: "object",
          properties: {
            node: { type: "string", description: "A child's name exactly as listed, or `this system`." },
            text: { type: "string" },
          },
          required: ["node", "text"],
        },
      },
      intent: {
        type: "array",
        description: "What the documents say about how a child or the system is built, what is inside it and how it connects, written so the next agent can work without the original documents.",
        items: {
          type: "object",
          properties: {
            node: { type: "string", description: "A child's name exactly as listed, or `this system`." },
            text: { type: "string" },
          },
          required: ["node", "text"],
        },
      },
      openQuestions: QUESTIONS,
    },
    required: ["given", "intent", "openQuestions"],
  },
};

export function orientationTool(includeSystem: boolean): Anthropic.Tool {
  return {
    name: "write_orientation",
    description: "Write the orientation for the agent that will design each child. This is the only output expected.",
    input_schema: {
      type: "object",
      properties: {
        ...(includeSystem
          ? { system: { type: "string", description: "Orientation for the agent that designs this whole system." } }
          : {}),
        children: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "The child's name exactly as listed." },
              text: { type: "string", description: "A short briefing: what it is for, where it sits in the whole, what it depends on, what it must get right." },
            },
            required: ["name", "text"],
          },
        },
      },
      required: [...(includeSystem ? ["system"] : []), "children"],
    },
  };
}

// ---- Checks on each answer ---------------------------------------------------------------------

export interface StructureAnswer {
  children?: { name?: string; kind?: string; count?: number; purpose?: string }[];
  openQuestions?: string[];
}
export interface RequirementsAnswer {
  assignments?: { id?: number; scope?: string; children?: string[] }[];
  openQuestions?: string[];
}
export interface InterfacesAnswer {
  interfaces?: { node?: string; inputs?: { name?: string; from?: string; note?: string }[]; outputs?: { name?: string; note?: string }[] }[];
  openQuestions?: string[];
}
export interface DetailsAnswer {
  given?: { node?: string; text?: string }[];
  intent?: { node?: string; text?: string }[];
  openQuestions?: string[];
}
export interface OrientationAnswer {
  system?: string;
  children?: { name?: string; text?: string }[];
}

const asCount = (n: unknown) => (Number.isFinite(Number(n)) && Number(n) >= 1 ? Math.round(Number(n)) : 1);
const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

/** Children with a name, no repeats. Orientation is filled in by the last pass. */
export function cleanStructure(answer: StructureAnswer): DesignChild[] {
  const seen = new Set<string>();
  const children: DesignChild[] = [];
  for (const c of Array.isArray(answer.children) ? answer.children : []) {
    const name = clean(c?.name);
    if (!name || seen.has(lc(name))) continue;
    seen.add(lc(name));
    children.push({
      name, kind: c.kind === "system" ? "system" : "part", count: asCount(c.count), purpose: clean(c.purpose), orientation: "",
    });
  }
  return children;
}

/** Every requirement gets exactly one scope. Unknown ids are dropped. A requirement nobody
 *  assigned, or assigned to children that don't exist, goes to everything beneath, and the
 *  reader is told. */
export function cleanAssignments(
  answer: RequirementsAnswer,
  requirements: RequirementInput[],
  children: DesignChild[],
  notices: string[],
): DesignRequirement[] {
  const names = new Map(children.map((c) => [lc(c.name), c.name]));
  const byId = new Map<number, { scope?: string; children?: string[] }>();
  for (const a of Array.isArray(answer.assignments) ? answer.assignments : []) {
    if (typeof a?.id === "number" && !byId.has(a.id)) byId.set(a.id, a);
  }

  const lost: number[] = [];
  const out = requirements.map((r): DesignRequirement => {
    const a = byId.get(r.id);
    let scope: RequirementScope = "all";
    let named: string[] = [];
    if (!a) {
      lost.push(r.id);
    } else if (a.scope === "system") {
      scope = "system";
    } else if (a.scope === "children") {
      named = [...new Set((a.children ?? []).map((n) => names.get(lc(String(n)))).filter((n): n is string => !!n))];
      if (named.length) scope = "children";
      else lost.push(r.id);
    }
    return { id: r.id, source: r.source, kind: r.kind, text: r.text, scope, children: scope === "children" ? named : [] };
  });
  if (lost.length) {
    notices.push(`${lost.length} requirement${lost.length === 1 ? " was" : "s were"} not assigned to anything that exists (${lost.join(", ")}); passed to everything beneath.`);
  }
  return out;
}

/** Interfaces for children that exist, one per child. Inputs that name a source that isn't a
 *  sibling, `above` or a requirement are kept and reported. */
export function cleanInterfaces(
  answer: InterfacesAnswer,
  children: DesignChild[],
  notices: string[],
): DesignInterface[] {
  const names = new Map(children.map((c) => [lc(c.name), c.name]));
  const out = new Map<string, DesignInterface>();
  for (const i of Array.isArray(answer.interfaces) ? answer.interfaces : []) {
    const node = names.get(lc(clean(i?.node)));
    if (!node || out.has(node)) continue;
    const inputs = (Array.isArray(i.inputs) ? i.inputs : [])
      .filter((x) => clean(x?.name))
      .map((x) => ({ name: clean(x.name), from: clean(x.from), note: clean(x.note) }));
    for (const input of inputs) {
      const from = lc(input.from);
      if (!names.has(from) && from !== "above" && !/^requirement \d+$/.test(from)) {
        notices.push(`"${node}" needs ${input.name} from "${input.from}", which is not a sibling, "above" or a requirement.`);
      }
    }
    out.set(node, {
      node,
      inputs,
      outputs: (Array.isArray(i.outputs) ? i.outputs : [])
        .filter((x) => clean(x?.name))
        .map((x) => ({ name: clean(x.name), note: clean(x.note) })),
    });
  }
  return children.map((c) => out.get(c.name) ?? { node: c.name, inputs: [], outputs: [] });
}

/** Notes for children that exist or for the system itself (`this system` becomes its name). */
export function cleanNotes(
  list: { node?: string; text?: string }[] | undefined,
  children: DesignChild[],
  selfName: string,
): DesignNote[] {
  const names = new Map(children.map((c) => [lc(c.name), c.name]));
  const out: DesignNote[] = [];
  for (const n of Array.isArray(list) ? list : []) {
    const text = clean(n?.text);
    if (!text) continue;
    const node = lc(clean(n.node)) === "this system" ? selfName : names.get(lc(clean(n.node)));
    if (node) out.push({ node, text });
  }
  return out;
}

export function cleanQuestions(...lists: (string[] | undefined)[]): string[] {
  return [...new Set(lists.flatMap((l) => (Array.isArray(l) ? l : [])).map(clean).filter(Boolean))];
}
