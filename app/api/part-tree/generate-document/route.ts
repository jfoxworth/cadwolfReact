import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";
import { anthropicClient } from "@/utils/anthropicClient";
import { getDocumentFullBlocks } from "@/utils/getDocumentFullBlocks";
import { findSimilarPartTreeDocuments } from "@/utils/findSimilarPartTreeDocuments";
import { getSolvedDocumentVariables, type SolvedVariable } from "@/utils/getSolvedDocumentVariables";
import { GENERATE_DOCUMENT_CONTENT_TOOL, GENERATE_DOCUMENT_CONTENT_TOOL_NAME } from "./tool";
import type { Block } from "@/types/document";

interface GeneratedBlock {
  type: "header" | "text" | "equation" | "symbolic_equation";
  text?: string;
  level?: number;
  raw?: string;
  expression?: string;
}

interface GeneratedImport {
  sourceFileId: number;
  sourceVariableName: string;
  localAlias?: string;
}

function formatTemplateBlocks(name: string, blocks: Block[]): string {
  const lines = blocks.map((b) => {
    if (b.type === "EQUATION") return `equation: ${b.definition.raw ?? ""}`;
    if (b.type === "HEADER") return `header (level ${b.definition.level ?? 2}): ${b.definition.text ?? ""}`;
    if (b.type === "TEXT") return `text: ${b.definition.text ?? ""}`;
    if (b.type === "SYMBOLIC_EQUATION") return `symbolic_equation: ${b.definition.expression ?? ""}`;
    return null;
  }).filter((l): l is string => Boolean(l));
  return `Reference document "${name}":\n${lines.length ? lines.join("\n") : "(no content)"}`;
}

function formatRequirementsContext(docs: { fileId: number; name: string; variables: SolvedVariable[] }[]): string {
  if (docs.length === 0) return "No requirements documents are available to import from yet.";
  return docs.map((d) => {
    const vars = d.variables.length
      ? d.variables.map((v) => `  - ${v.name} = ${v.value}${v.units ? ` [${v.units}]` : ""} (from "${v.raw}")`).join("\n")
      : "  (no solved variables)";
    return `Requirements document "${d.name}" (id ${d.fileId}):\n${vars}`;
  }).join("\n\n");
}

function formatDependencyContext(docs: { fileId: number; name: string; variables: SolvedVariable[] }[]): string | null {
  if (docs.length === 0) return null;
  return docs.map((d) => {
    const vars = d.variables.length
      ? d.variables.map((v) => `  - ${v.name} = ${v.value}${v.units ? ` [${v.units}]` : ""} (from "${v.raw}")`).join("\n")
      : "  (no solved variables)";
    return `Physically connected part "${d.name}" (id ${d.fileId}):\n${vars}`;
  }).join("\n\n");
}

export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();

  // This is the only other route (besides /api/chat) that calls the Anthropic API — it must be
  // gated the same way, not just rely on edit permission. Without this, anyone with a valid
  // session and edit access to any file could trigger an Anthropic call directly, bypassing the
  // chat allow-list entirely (the chat UI itself is the only thing that normally reaches this
  // route, and that UI is already hidden from everyone but the allowed user).
  const allowedUserId = process.env.ALLOWED_CHAT_USER_ID
    ? parseInt(process.env.ALLOWED_CHAT_USER_ID)
    : null;
  if (!allowedUserId || userId !== allowedUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    fileId, name, description, isRequirementsDocument, templateFileId, referenceTreeId, buildPrompt,
    requirementsContext, dependencyContext,
  }: {
    fileId: number; name: string; description: string; isRequirementsDocument: boolean;
    templateFileId?: number; referenceTreeId?: number; buildPrompt?: string;
    requirementsContext?: number[]; dependencyContext?: number[];
  } = body;

  const canEdit = await checkPermission(Number(fileId), userId, "edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // The model's own templateFileId guess (propose_build_plan, Stage 4) is only ever read from
  // a name-only tree dump (utils/partTreeToText.ts never shows equation content) — it has no
  // real signal to match on. When a reference tree is known, resolve the actual template via a
  // content-based nearest-neighbor search instead of trusting that guess at all. Falls back to
  // the model's guess only when no reference tree was picked (older/degraded callers).
  let resolvedTemplateFileId: number | undefined = templateFileId;
  if (referenceTreeId) {
    try {
      const [match] = await findSimilarPartTreeDocuments(userId, Number(referenceTreeId), `${name}. ${description}`, 1);
      resolvedTemplateFileId = match?.fileId;
    } catch (err) {
      // This project's Voyage account is rate-limited (3 req/min, no payment method on file —
      // see scripts/backfill-embeddings.ts) and Stage 6 calls this once per document with no
      // pacing, so a transient 429 here is expected under a multi-document build, not a real
      // failure. The match is a best-effort upgrade over the model's own guess, never something
      // worth failing the whole document generation for — fall back to that guess instead.
      console.error("findSimilarPartTreeDocuments failed, falling back to model-guessed templateFileId:", err);
    }
  }

  // A bad/stale id is treated as "no reference" either way — never trusted at face value here.
  let templateSection: string | null = null;
  if (resolvedTemplateFileId) {
    const canViewTemplate = await checkPermission(Number(resolvedTemplateFileId), userId, "view");
    if (canViewTemplate) {
      const template = await getDocumentFullBlocks(Number(resolvedTemplateFileId));
      if (template) templateSection = formatTemplateBlocks(template.name, template.blocks);
    }
  }

  // Only ids that both exist and are actually view-permitted make it into the resolved map —
  // this map is also the validation source of truth for the model's returned `imports` below,
  // so a dropped id here mechanically can't be imported from either.
  const resolvedRequirements: { fileId: number; name: string; variables: SolvedVariable[] }[] = [];
  for (const id of requirementsContext ?? []) {
    const canView = await checkPermission(Number(id), userId, "view");
    if (!canView) continue;
    const { name: reqName, variables } = await getSolvedDocumentVariables(Number(id));
    resolvedRequirements.push({ fileId: Number(id), name: reqName, variables });
  }

  // Sibling physical parts this node depends on (propose_build_plan's dependsOnNodeNames,
  // resolved to real fileIds client-side once each dependency has actually generated+solved —
  // see components/part-tree/PartTreeWrapper.tsx). A real mating-part relationship, kept in a
  // separately-labeled section below so the model doesn't mistake it for a requirements import.
  const resolvedDependencies: { fileId: number; name: string; variables: SolvedVariable[] }[] = [];
  for (const id of dependencyContext ?? []) {
    const canView = await checkPermission(Number(id), userId, "view");
    if (!canView) continue;
    const { name: depName, variables } = await getSolvedDocumentVariables(Number(id));
    resolvedDependencies.push({ fileId: Number(id), name: depName, variables });
  }
  const dependencySection = formatDependencyContext(resolvedDependencies);

  const userMessage = [
    `Document name: ${name}`,
    `Description: ${description}`,
    `Role: ${isRequirementsDocument ? "requirements document" : "physical part"}`,
    buildPrompt ? `Original build request: ${buildPrompt}` : null,
    "",
    templateSection ? `Generation mode: adapt the reference below.\n\n${templateSection}` : "Generation mode: generate from scratch using engineering domain knowledge.",
    "",
    isRequirementsDocument
      ? "This is a requirements document — do not propose any imports."
      : `Available requirements documents (import from these only, never a guessed id/name):\n${formatRequirementsContext(resolvedRequirements)}`,
    dependencySection && !isRequirementsDocument
      ? `\nPhysically connected part(s) already solved (import from these only when this document's role genuinely depends on one of them, never guess):\n${dependencySection}`
      : null,
  ].filter((l) => l !== null).join("\n");

  const systemPrompt = readFileSync(join(process.cwd(), "prompts", "generate-document-content.md"), "utf-8");

  const message = await anthropicClient.messages.create({
    model: process.env.AI_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: systemPrompt,
    tools: [GENERATE_DOCUMENT_CONTENT_TOOL],
    tool_choice: { type: "tool", name: GENERATE_DOCUMENT_CONTENT_TOOL_NAME },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolUse = message.content.find((b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use");
  if (!toolUse) return NextResponse.json({ error: "Model didn't return content." }, { status: 502 });

  const input = toolUse.input as { blocks?: GeneratedBlock[]; imports?: GeneratedImport[] };
  const blocks = input.blocks ?? [];

  // Validate every returned import against what was actually resolved above — the model's
  // output is never trusted blindly for an id/variable name it wasn't explicitly given.
  const imports: { sourceFileId: number; sourceFileName: string; sourceVariableName: string; localAlias: string; value: number; units?: string }[] = [];
  if (!isRequirementsDocument) {
    for (const imp of input.imports ?? []) {
      const source = resolvedRequirements.find((r) => r.fileId === imp.sourceFileId)
        ?? resolvedDependencies.find((r) => r.fileId === imp.sourceFileId);
      const variable = source?.variables.find((v) => v.name === imp.sourceVariableName);
      if (!source || !variable || variable.value === undefined) continue;
      imports.push({
        sourceFileId: source.fileId,
        sourceFileName: source.name,
        sourceVariableName: variable.name,
        localAlias: imp.localAlias || variable.name,
        value: variable.value,
        units: variable.units,
      });
    }
  }

  return NextResponse.json({ blocks, imports });
}
