// The shape of a design document, shared by the code that writes one (coordinator.ts) and the
// code that reads one (the system coordinator reads the document one level above it, the part
// agent reads its part's). A design document IS its structured data: fixed sections, each holding
// JSON, plus one prose section (Orientation) addressed to the agent that picks the document up.
// Nothing is rendered into prose and parsed back. See PART_TREE_BUILD_PROCESS.md.
//
//   H1  Design: <name>
//   H2  Orientation        prose: what this is for, where it sits, what to get right
//   H2  Structure          JSON { kind, path, count, siblings, children[] }
//   H2  Requirements       JSON [ { id, source, kind, text, scope, children } ]
//   H2  Interfaces         JSON [ { node, inputs[], outputs[] } ]
//   H2  Given parameters   JSON [ { node, text } ]
//   H2  Design intent      JSON [ { node, text } ]
//   H2  Open questions     JSON [ "..." ]
//
// A JSON section is one text block holding the JSON in a <pre><code> element.
import { db } from "@/utils/db";
import type { RequirementKind } from "./gatherRequirements";
import { htmlToText } from "./htmlToText";
import { escapeHtml, textToHtml, type DesignBlock } from "./writeDesignDocument";

export const SECTION_ORIENTATION = "Orientation";
export const SECTION_STRUCTURE = "Structure";
export const SECTION_REQUIREMENTS = "Requirements";
export const SECTION_INTERFACES = "Interfaces";
export const SECTION_GIVEN = "Given parameters";
export const SECTION_INTENT = "Design intent";
export const SECTION_QUESTIONS = "Open questions";

const COMPONENT_TEXT = 1;
const COMPONENT_HEADER = 2;

/** Who a requirement applies to, as decided by the coordinator that wrote the document:
 *  - all: this system and everything beneath it (a minimum factor of safety).
 *  - system: this system as a whole, and not passed down (a total mass limit checked here).
 *  - children: only the systems or parts named in `children`. */
export type RequirementScope = "all" | "system" | "children";

export interface DesignRequirement {
  /** Id of the flagged block in the requirements document. */
  id: number;
  /** Name of the requirements document it came from. */
  source: string;
  kind: RequirementKind;
  /** The text, or the equation's raw form. */
  text: string;
  scope: RequirementScope;
  children: string[];
}

export interface DesignChild {
  name: string;
  kind: "system" | "part";
  /** How many identical instances there are. */
  count: number;
  purpose: string;
  /** Prose for the agent that designs this child. Becomes that child's own Orientation. */
  orientation: string;
}

export interface DesignInput {
  /** A variable-style name, e.g. loadPerStrut. */
  name: string;
  /** A sibling's name, "above" (handed down by the design above) or "requirement N". */
  from: string;
  note: string;
}

export interface DesignOutput {
  name: string;
  note: string;
}

export interface DesignInterface {
  node: string;
  inputs: DesignInput[];
  outputs: DesignOutput[];
}

export interface DesignNote {
  node: string;
  text: string;
}

export interface DesignData {
  name: string;
  kind: "root" | "system" | "part";
  /** Names from the part tree down to this item, inclusive: where it lies in the whole. */
  path: string[];
  count: number;
  /** The other items in the same system. */
  siblings: string[];
  children: DesignChild[];
  orientation: string;
  requirements: DesignRequirement[];
  /** About this item and, for a system, the items directly beneath it. */
  interfaces: DesignInterface[];
  given: DesignNote[];
  intent: DesignNote[];
  openQuestions: string[];
}

function jsonBlock(value: unknown): DesignBlock {
  return { type: "text", html: `<pre><code>${escapeHtml(JSON.stringify(value, null, 2))}</code></pre>` };
}

/** The document's blocks, in section order. */
export function designBlocks(data: DesignData): DesignBlock[] {
  const section = (title: string, value: unknown): DesignBlock[] => [
    { type: "header", text: title, level: 2 },
    jsonBlock(value),
  ];
  return [
    { type: "header", text: `Design: ${data.name}`, level: 1 },
    { type: "header", text: SECTION_ORIENTATION, level: 2 },
    { type: "text", html: textToHtml(data.orientation) || "<p>None.</p>" },
    ...section(SECTION_STRUCTURE, {
      kind: data.kind, path: data.path, count: data.count, siblings: data.siblings, children: data.children,
    }),
    ...section(SECTION_REQUIREMENTS, data.requirements),
    ...section(SECTION_INTERFACES, data.interfaces),
    ...section(SECTION_GIVEN, data.given),
    ...section(SECTION_INTENT, data.intent),
    ...section(SECTION_QUESTIONS, data.openQuestions),
  ];
}

/** The document as text for a model: the same sections, in the same order. */
export function designText(data: DesignData): string {
  const section = (title: string, value: unknown) => `## ${title}\n${JSON.stringify(value, null, 2)}`;
  return [
    `# Design: ${data.name}`,
    `## ${SECTION_ORIENTATION}\n${data.orientation || "None."}`,
    section(SECTION_STRUCTURE, {
      kind: data.kind, path: data.path, count: data.count, siblings: data.siblings, children: data.children,
    }),
    section(SECTION_REQUIREMENTS, data.requirements),
    section(SECTION_INTERFACES, data.interfaces),
    section(SECTION_GIVEN, data.given),
    section(SECTION_INTENT, data.intent),
    section(SECTION_QUESTIONS, data.openQuestions),
  ].join("\n\n");
}

function parseContent(content: string | null): Record<string, unknown> {
  if (!content) return {};
  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** The text inside a JSON block's HTML, with its line breaks and spacing kept. */
function codeText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const strings = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === "string");

const KINDS: RequirementKind[] = ["text", "equation", "symbolic_equation"];

/** Builds the data from a document's blocks (component type and saved content, in order).
 *  Throws if a JSON section has been edited into something that isn't JSON. */
export function parseDesignBlocks(
  name: string,
  components: { componentTypeId: number; content: string | null }[],
): DesignData {
  const data: DesignData = {
    name, kind: "system", path: [], count: 1, siblings: [], children: [], orientation: "",
    requirements: [], interfaces: [], given: [], intent: [], openQuestions: [],
  };
  const raw = new Map<string, unknown>();
  const orientation: string[] = [];
  let section = "";

  for (const c of components) {
    const content = parseContent(c.content);
    if (c.componentTypeId === COMPONENT_HEADER) {
      if (Number(content.level ?? 2) === 2) section = str(content.text);
      continue;
    }
    if (c.componentTypeId !== COMPONENT_TEXT) continue;
    const html = str(content.text);

    if (section === SECTION_ORIENTATION) {
      // One line per paragraph from htmlToText; the writer split paragraphs on blank lines.
      const text = htmlToText(html).split("\n").join("\n\n");
      if (text && text !== "None.") orientation.push(text);
    } else if ([SECTION_STRUCTURE, SECTION_REQUIREMENTS, SECTION_INTERFACES, SECTION_GIVEN, SECTION_INTENT, SECTION_QUESTIONS].includes(section)) {
      try {
        raw.set(section, JSON.parse(codeText(html)));
      } catch {
        throw new Error(`The "${section}" section of "${name}" is not valid JSON, so the design can't be read.`);
      }
    }
  }

  data.orientation = orientation.join("\n\n");

  const structure = obj(raw.get(SECTION_STRUCTURE));
  data.kind = structure.kind === "root" || structure.kind === "part" ? structure.kind : "system";
  data.path = strings(structure.path);
  data.count = Number.isFinite(Number(structure.count)) && Number(structure.count) >= 1 ? Math.round(Number(structure.count)) : 1;
  data.siblings = strings(structure.siblings);
  data.children = arr(structure.children).map(obj).map((c) => ({
    name: str(c.name),
    kind: c.kind === "system" ? "system" : "part",
    count: Number.isFinite(Number(c.count)) && Number(c.count) >= 1 ? Math.round(Number(c.count)) : 1,
    purpose: str(c.purpose),
    orientation: str(c.orientation),
  }));

  data.requirements = arr(raw.get(SECTION_REQUIREMENTS)).map(obj).map((r) => ({
    id: Number(r.id),
    source: str(r.source),
    kind: KINDS.includes(r.kind as RequirementKind) ? (r.kind as RequirementKind) : "text",
    text: str(r.text),
    scope: (r.scope === "system" || r.scope === "children" ? r.scope : "all") as RequirementScope,
    children: strings(r.children),
  })).filter((r) => Number.isFinite(r.id) && r.id > 0);

  data.interfaces = arr(raw.get(SECTION_INTERFACES)).map(obj).map((i) => ({
    node: str(i.node),
    inputs: arr(i.inputs).map(obj).map((x) => ({ name: str(x.name), from: str(x.from), note: str(x.note) })),
    outputs: arr(i.outputs).map(obj).map((x) => ({ name: str(x.name), note: str(x.note) })),
  }));
  data.given = arr(raw.get(SECTION_GIVEN)).map(obj).map((n) => ({ node: str(n.node), text: str(n.text) }));
  data.intent = arr(raw.get(SECTION_INTENT)).map(obj).map((n) => ({ node: str(n.node), text: str(n.text) }));
  data.openQuestions = strings(raw.get(SECTION_QUESTIONS));
  return data;
}

/** Reads a design document back from the database. */
export async function readDesignDocument(fileId: number): Promise<DesignData> {
  const [file, components] = await Promise.all([
    db.file.findUnique({ where: { id: fileId }, select: { name: true } }),
    db.component.findMany({
      where: { fileId, deletedAt: null },
      orderBy: { order: "asc" },
      select: { componentTypeId: true, content: true },
    }),
  ]);
  const name = (file?.name ?? `File ${fileId}`).replace(/^Design:\s*/, "");
  return parseDesignBlocks(name, components);
}
