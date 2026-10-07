"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { Bot, X, Send, Trash2, MessageCircle, Eye, Hammer, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  useChat, type BlockProposal, type ChatMode, type BuildStage, type BuildCandidate,
  type RequirementItem, type BuildPlanNode, type GeneratedDocState, type GenerationStatus,
} from "@/context/ChatContext";

// Mirrors derivePageType() in app/api/chat/route.ts — same fallback ("workspace" for an
// unrecognized path) and the same four route segments (utils/resolveRoute.ts's TYPE_ROUTE
// values), duplicated locally rather than imported since that file also imports the Prisma
// client (@/utils/db), which can't be pulled into a client bundle.
const PAGE_TYPES = new Set(["document", "dataset", "part-tree", "workspace"]);
function derivePageType(pathname: string | null): string {
  const segment = pathname?.split("/").filter(Boolean)[0];
  return segment && PAGE_TYPES.has(segment) ? segment : "workspace";
}

// Hexagon geometry/technique reproduced from the main nav hexagons
// (components/side-menu/SideMenuNew.tsx: HEX_CLIP / HexNav / NBRS)
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
const HEX_W = 76;
const HEX_H = (HEX_W * 2) / Math.sqrt(3); // ≈ 64.66 — pointy-top hexagon aspect ratio
const WINDOW_W = 600;

// ─── simple toggle (Workspace/Dataset/Part Tree) ───────────────────────────
// The mode-switcher cluster below is Document-only — everywhere else keeps the original
// single-hexagon toggle exactly as it was before that redesign (bottom-right, connecting line,
// docked full-height panel with a header), since none of Overview/Inspect/Build has any
// meaning on a page that has no selectable blocks in the first place.
const HEX_BOTTOM = 24;
const HEX_RIGHT = 24;
const LINE_GAP = 30;
const LINE_BOTTOM = HEX_BOTTOM + HEX_H;

// ─── mode-switcher cluster (upper-right) ───────────────────────────────────
// Same honeycomb-neighbor math as SideMenuNew's main cluster. Build sits at the center slot —
// the old standalone chat-toggle hexagon's spot — with Overview/Inspect at two of its six
// honeycomb-adjacent slots (Left / LowerLeft, so the cluster only grows down-and-left, away
// from its top-right anchor). All three are always shown; Build no longer disappears when
// !canBuild — it stays clickable, and the "not checked out" notice further down explains why
// nothing happens yet, rather than hiding the option outright.
const CLUSTER_TOP = 24;
const CLUSTER_RIGHT = 24;
const NBR_DTOP = (HEX_W * Math.sqrt(3)) / 2;
const NBR_DLEFT = HEX_W / 2;
const CENTER_POS: [number, number] = [0, HEX_W];
const MODE_POS: Record<ChatMode, [number, number]> = {
  overview: [0, 0],
  inspect: [NBR_DTOP, NBR_DLEFT],
  build: CENTER_POS,
};
const CLUSTER_W = HEX_W * 2 + NBR_DLEFT;
const CLUSTER_H = NBR_DTOP + HEX_H;

const MODE_ICONS: Record<ChatMode, LucideIcon> = {
  overview: MessageCircle,
  inspect: Eye,
  build: Hammer,
};

// Color maps to risk/consequence, not just distinctness (per the design discussion): Overview is
// pure talk (cool blue, safest), Inspect can edit one existing item (amber, in between), Build
// adds new blocks unprompted (red) — reusing the exact "red accent" palette SideMenuNew.tsx
// already uses for its own consequential action (the Save hex's `accent: "red"` variant),
// rather than inventing a new destructive-action color.
interface ModeColor {
  glow: string;
  halo: string;
  litBg: string;
  active: string;
  /** Flat light background for panel content sections (the hex badges use `litBg`'s gradient
   *  instead — this is for plain UI chrome like the selected-block chip). */
  soft: string;
  /** Pill/chip border color. */
  border: string;
  /** Primary label text color (mode's -900 shade). */
  text: string;
  /** Secondary/muted text color (mode's -600 shade). */
  textMuted: string;
}
const MODE_COLORS: Record<ChatMode, ModeColor> = {
  overview: {
    glow: "rgba(37,99,235,0.65)",
    halo: "rgba(37,99,235,0.15)",
    litBg: "linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)",
    active: "#2563eb",
    soft: "#eff6ff",
    border: "#93c5fd",
    text: "#1e3a8a",
    textMuted: "#2563eb",
  },
  inspect: {
    glow: "rgba(217,119,6,0.65)",
    halo: "rgba(217,119,6,0.15)",
    litBg: "linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%)",
    active: "#d97706",
    soft: "#fffbeb",
    border: "#fcd34d",
    text: "#78350f",
    textMuted: "#d97706",
  },
  build: {
    glow: "rgba(220,38,38,0.65)",
    halo: "rgba(220,38,38,0.15)",
    litBg: "linear-gradient(145deg, #fff0f0 0%, #fee2e2 100%)",
    active: "#dc2626",
    soft: "#fef2f2",
    border: "#fca5a5",
    text: "#7f1d1d",
    textMuted: "#dc2626",
  },
};

// The original 4 block tools are the only ones with an edit-vs-add distinction
// (targetBlockId present/absent) — every tool added since is a one-shot action, so this set
// is what gates showing that "· edit"/"· add" suffix at the render site below.
const BLOCK_TOOLS = new Set<BlockProposal["tool"]>([
  "equation_block", "symbolic_equation_block", "text_block", "header_block", "if_else_block",
]);

const MODE_LABELS: Record<ChatMode, string> = {
  overview: "Overview mode",
  inspect: "Inspect mode",
  build: "Build mode",
};

const PROPOSAL_LABELS: Record<BlockProposal["tool"], string> = {
  equation_block: "Equation",
  symbolic_equation_block: "Symbolic equation",
  text_block: "Text",
  header_block: "Header",
  if_else_block: "If/Else",
  create_file: "New file",
  rename_file: "Rename",
  move_file: "Move",
  delete_file: "Delete",
  configure_dataset_parsers: "Parser config",
  edit_dataset_content: "Dataset content",
  edit_dataset_metadata: "Dataset title/description",
};

function proposalPreview(p: BlockProposal): string {
  if (p.tool === "if_else_block") {
    const input = p.input as { branches?: { type: string; conditions?: { flagText: string; conditionText: string; dependentText: string }[]; equations?: string[] }[] };
    return (input.branches ?? [])
      .map((br) => {
        const cond = br.type === "else" || !br.conditions?.length
          ? br.type
          : `${br.type} (${br.conditions.map((c) => `${c.flagText} ${c.conditionText} ${c.dependentText}`).join(" ")})`;
        return `${cond}: ${(br.equations ?? []).join(", ") || "(no equations)"}`;
      })
      .join(" / ");
  }
  if (p.tool === "create_file") {
    const input = p.input as { fileTypeId?: string; name?: string };
    return `${input.fileTypeId ?? "?"}${input.name ? `: "${input.name}"` : " (default name)"}`;
  }
  if (p.tool === "rename_file") {
    const input = p.input as { targetId?: string; name?: string };
    return `#${input.targetId ?? "?"} → "${input.name ?? ""}"`;
  }
  if (p.tool === "move_file") {
    const input = p.input as { targetId?: string; destinationId?: string };
    return `#${input.targetId ?? "?"} → folder #${input.destinationId ?? "?"}`;
  }
  if (p.tool === "delete_file") {
    const input = p.input as { targetId?: string };
    return `#${input.targetId ?? "?"}`;
  }
  if (p.tool === "configure_dataset_parsers") {
    const input = p.input as { parsers?: { label: string; separator: string }[] };
    return (input.parsers ?? []).map((parser) => `${parser.label} (${JSON.stringify(parser.separator)})`).join(", ") || "(no parsers)";
  }
  if (p.tool === "edit_dataset_content") {
    const input = p.input as { rawText?: string };
    const text = input.rawText ?? "";
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }
  if (p.tool === "edit_dataset_metadata") {
    const input = p.input as { name?: string; description?: string };
    return [input.name && `title: "${input.name}"`, input.description && `description: "${input.description}"`].filter(Boolean).join(", ");
  }
  const input = p.input as { raw?: string; expression?: string; text?: string };
  return input.raw ?? input.expression ?? input.text ?? "";
}

// Quick-action suggestions, keyed by the selected block's type label (see BLOCK_TYPE_LABELS in
// documentWrapper.tsx). Only defined for the block types April can currently act on — an
// unlisted selected type (e.g. a plot) just shows the chip with no suggestions.
const SELECTED_SUGGESTIONS: Record<string, string[]> = {
  Equation: [
    "What's wrong with this equation?",
    "Add text before this explaining it",
    "Add text after this explaining the result",
  ],
  "Symbolic Equation": [
    "What's wrong with this equation?",
    "Add text before this explaining it",
    "Add text after this explaining the result",
  ],
  Text: [
    "Add an equation after this",
    "Add a symbolic equation after this",
    "Does this match the equations around it?",
  ],
  Header: [
    "What should this section contain?",
    "Add an equation under this heading",
    "Summarize this section",
  ],
  // Part-tree selection types (see components/part-tree/PartTreeWrapper.tsx's selected-block
  // effect and utils/partTreeToText.ts's itemTypeLabel) — same dictionary, no collision since
  // document and part-tree never render each other's type strings.
  Part: [
    "What does this part need to satisfy?",
    "Add a requirements document next to this",
    "Change this part's quantity",
  ],
  Subsystem: [
    "What's in this subsystem?",
    "Add a part to this subsystem",
    "Summarize this subsystem's mass",
  ],
  "Requirements Document": [
    "What variables does this define?",
    "Which parts import from this?",
  ],
  "Part Tree Root": [
    "Summarize this part tree",
    "Add a new subsystem",
  ],
};

// Shown instead, when nothing is selected — page-wide asks rather than single-block ones,
// keyed by page type since each page type supports different things (documents: block Q&A;
// workspace: browse + create_file; dataset: read-only Q&A; part-tree: structure Q&A + build).
const GENERAL_SUGGESTIONS_BY_PAGE_TYPE: Record<string, string[]> = {
  document: [
    "How do I solve the problem in this document?",
    "Review this document for errors",
    "Summarize this document",
  ],
  dataset: [
    "Summarize this dataset",
    "How many rows does this have?",
    "Describe the structure of this dataset",
  ],
  workspace: [
    "Create a new document here",
    "Create a new dataset here",
    "What's in this workspace?",
  ],
  "part-tree": [
    "Summarize this part tree",
    "Add a new subsystem",
    "What's missing a requirements document?",
  ],
};

/** Small hex badge used for the header and per-message assistant avatar — always "lit" green. */
function HexBadge({ size, iconSize }: { size: number; iconSize: number }) {
  return (
    <div style={{ position: "relative", width: size, height: (size * 2) / Math.sqrt(3), flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: HEX_CLIP,
          background: "linear-gradient(145deg, #d1fae5 0%, #6ee7b7 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: HEX_CLIP,
            background: "linear-gradient(160deg, rgba(255,255,255,0.5) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />
        <Bot size={iconSize} style={{ color: "#065f46", position: "relative" }} />
      </div>
    </div>
  );
}

/** One ring hexagon in the mode-switcher cluster — same visual technique (halo, gradient,
 *  glow filter) as the chat-toggle hexagon below and SideMenuNew's HexNav, just generalized
 *  for the three mode buttons instead of duplicating this block three times inline. */
function ModeHex({
  mode, pos, active, onClick,
}: { mode: ChatMode; pos: [number, number]; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const lit = hov || active;
  const [top, left] = pos;
  const Icon = MODE_ICONS[mode];
  const colors = MODE_COLORS[mode];
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={MODE_LABELS[mode]}
      aria-label={MODE_LABELS[mode]}
      aria-pressed={active}
      style={{
        position: "absolute",
        top,
        left,
        width: HEX_W,
        height: HEX_H,
        cursor: "pointer",
        zIndex: lit ? 20 : 1,
        pointerEvents: "auto",
        transform: lit ? "scale(1.1) translateZ(0)" : "scale(1) translateZ(0)",
        transition: "transform 0.2s cubic-bezier(.34,1.56,.64,1), filter 0.2s ease",
        filter: lit
          ? `drop-shadow(0 0 12px ${colors.glow}) drop-shadow(0 4px 10px rgba(0,0,0,0.3))`
          : "drop-shadow(0 3px 8px rgba(0,0,0,0.2)) drop-shadow(0 1px 3px rgba(0,0,0,0.12))",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -4,
          clipPath: HEX_CLIP,
          background: lit ? colors.halo : "transparent",
          transition: "background 0.2s",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          clipPath: HEX_CLIP,
          background: lit ? colors.litBg : "linear-gradient(145deg, #ffffff 0%, #f2f2f2 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: HEX_CLIP,
            background: lit
              ? "linear-gradient(160deg, rgba(255,255,255,0.5) 0%, transparent 50%)"
              : "linear-gradient(160deg, rgba(255,255,255,0.85) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />
        <Icon size={18} style={{ color: lit ? colors.active : "#374151", position: "relative", transition: "color 0.2s" }} />
        <span
          style={{
            fontSize: 7,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: lit ? colors.active : "#9ca3af",
            textTransform: "uppercase",
            userSelect: "none",
            position: "relative",
            transition: "color 0.2s",
          }}
        >
          {mode}
        </span>
      </div>
    </button>
  );
}

function countBuildPlanNodes(nodes: BuildPlanNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countBuildPlanNodes(n.children ?? []), 0);
}

const BUILD_STAGE_LABELS: Record<BuildStage, string> = {
  1: "Prompt",
  2: "Select reference",
  3: "Requirements",
  4: "Review plan",
  5: "Build",
  6: "Generate content",
};

/** Build mode's 6-stage wizard indicator — always visible in Build mode, clickable on any
 *  stage that already has supporting data (or is behind the current stage) so the user can
 *  jump back without losing buildCandidates/proposedRequirements/proposedBuildPlan/
 *  buildDocuments (ChatContext keeps all four around regardless of which stage is showing). */
function BuildStageIndicator({
  stage, hasCandidates, hasRequirements, hasTree, hasDocuments, onJump,
}: {
  stage: BuildStage; hasCandidates: boolean; hasRequirements: boolean; hasTree: boolean; hasDocuments: boolean;
  onJump: (s: BuildStage) => void;
}) {
  const reachable = (s: BuildStage): boolean => {
    if (s <= stage) return true;
    if (s === 2) return hasCandidates;
    if (s === 3) return hasRequirements;
    if (s === 4 || s === 5) return hasTree;
    if (s === 6) return hasDocuments;
    return false;
  };
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 text-xs" style={{ background: MODE_COLORS.build.soft, borderTop: `1px solid ${MODE_COLORS.build.border}` }}>
      {([1, 2, 3, 4, 5, 6] as BuildStage[]).map((s, i) => {
        const active = s === stage;
        const canJump = reachable(s) && s !== stage;
        return (
          <div key={s} className="flex items-center gap-1.5">
            {i > 0 && <span style={{ color: MODE_COLORS.build.border }}>→</span>}
            <button
              onClick={() => canJump && onJump(s)}
              disabled={!canJump}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors"
              style={{
                background: active ? MODE_COLORS.build.active : "transparent",
                color: active ? "#fff" : reachable(s) ? MODE_COLORS.build.text : "#9ca3af",
                cursor: canJump ? "pointer" : "default",
                fontWeight: active ? 700 : 500,
              }}
            >
              <span>{s}</span>
              <span className="hidden sm:inline">{BUILD_STAGE_LABELS[s]}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Stage 2 — real selectable candidate cards from find_similar_part_trees, parsed server-side
 *  into a dedicated "candidates" event rather than left as prose (see app/api/chat/route.ts).
 *  Renders even when candidates is empty — that's a real outcome (nothing close exists), not
 *  nothing-to-show, so it still needs its own acknowledgment + way to continue. */
function CandidateCards({
  candidates, disabled, onSelect, onSkip,
}: { candidates: BuildCandidate[]; disabled: boolean; onSelect: (c: BuildCandidate) => void; onSkip: () => void }) {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3 border-t border-gray-100" style={{ background: MODE_COLORS.build.soft }}>
        <p className="text-xs" style={{ color: MODE_COLORS.build.text }}>No similar existing part trees found.</p>
        <button
          onClick={onSkip}
          disabled={disabled}
          className="self-start rounded px-2 py-1 text-xs text-white transition-colors disabled:opacity-40"
          style={{ background: MODE_COLORS.build.active }}
        >
          Build from scratch
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-t border-gray-100" style={{ background: MODE_COLORS.build.soft }}>
      <p className="text-xs font-semibold" style={{ color: MODE_COLORS.build.text }}>Closest existing part trees:</p>
      {candidates.map((c) => (
        <div key={c.fileId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs" style={{ border: `1px solid ${MODE_COLORS.build.border}` }}>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900">{c.name}</p>
            <p className="text-gray-400">id {c.fileId} · distance {c.distance.toFixed(3)}</p>
          </div>
          <button
            onClick={() => onSelect(c)}
            disabled={disabled}
            className="shrink-0 rounded px-2 py-1 text-white transition-colors disabled:opacity-40"
            style={{ background: MODE_COLORS.build.active }}
          >
            Select
          </button>
        </div>
      ))}
      <button
        onClick={onSkip}
        disabled={disabled}
        className="self-start text-xs underline transition-opacity hover:opacity-70 disabled:opacity-40"
        style={{ color: MODE_COLORS.build.textMuted }}
      >
        None of these are close enough
      </button>
    </div>
  );
}

const REQUIREMENT_SOURCE_LABEL: Record<RequirementItem["source"], string> = {
  reference: "from reference tree",
  inferred_from_prompt: "from your prompt",
};

/** Stage 3 — requirements documents specifically, surfaced as their own checkpoint before the
 *  full tree proposal (Stage 4) so the user sees what's driving the design and can add one if
 *  nothing was identified. Renders even when items is empty — same reasoning as CandidateCards'
 *  empty state above. onContinue/onAddRequirement/onSkip all send a plain chat message (the
 *  model re-calls propose_requirements_review on an edit, or moves on to propose_build_plan
 *  once the user confirms) — nothing here is applied locally. */
function RequirementsReviewPanel({
  items, disabled, onContinue, onRequestChange, onAddRequirement, onSkip, onBack,
}: {
  items: RequirementItem[]; disabled: boolean; onContinue: () => void;
  onRequestChange: (text: string) => void; onAddRequirement: (description: string) => void;
  onSkip: () => void; onBack: () => void;
}) {
  const [text, setText] = useState("");
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-3 px-4 py-3 border-t border-gray-100" style={{ background: MODE_COLORS.build.soft }}>
        <p className="text-xs" style={{ color: MODE_COLORS.build.text }}>
          No requirements document found — want to add one?
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim() && !disabled) { onAddRequirement(text.trim()); setText(""); }
            }}
            placeholder="e.g. a load limit for the rods"
            className="flex-1 rounded-lg px-2 py-1.5 text-xs outline-none"
            style={{ border: `1px solid ${MODE_COLORS.build.border}` }}
          />
          <button
            onClick={() => { if (text.trim()) { onAddRequirement(text.trim()); setText(""); } }}
            disabled={disabled || !text.trim()}
            className="shrink-0 rounded px-2 py-1.5 text-xs text-white transition-colors disabled:opacity-40"
            style={{ background: MODE_COLORS.build.active }}
          >
            Add
          </button>
        </div>
        <div className="flex justify-between">
          <button onClick={onBack} disabled={disabled} className="text-xs underline transition-opacity hover:opacity-70 disabled:opacity-40" style={{ color: MODE_COLORS.build.textMuted }}>
            Back
          </button>
          <button
            onClick={onSkip}
            disabled={disabled}
            className="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: MODE_COLORS.build.active }}
          >
            No, continue without one
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-t border-gray-100" style={{ background: MODE_COLORS.build.soft }}>
      <p className="text-xs font-semibold" style={{ color: MODE_COLORS.build.text }}>Requirements documents:</p>
      {items.map((item, i) => (
        <div key={i} className="rounded-lg bg-white px-3 py-2 text-xs" style={{ border: `1px solid ${MODE_COLORS.build.border}` }}>
          <p className="font-medium text-gray-900">
            {item.name}
            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
              {REQUIREMENT_SOURCE_LABEL[item.source]}
            </span>
          </p>
          <p className="text-gray-500">{item.description}</p>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim() && !disabled) { onRequestChange(text.trim()); setText(""); }
          }}
          placeholder="Request a change, e.g. &quot;also add a tolerance requirement&quot;"
          className="flex-1 rounded-lg px-2 py-1.5 text-xs outline-none"
          style={{ border: `1px solid ${MODE_COLORS.build.border}` }}
        />
        <button
          onClick={() => { if (text.trim()) { onRequestChange(text.trim()); setText(""); } }}
          disabled={disabled || !text.trim()}
          className="shrink-0 rounded px-2 py-1.5 text-xs text-white transition-colors disabled:opacity-40"
          style={{ background: MODE_COLORS.build.active }}
        >
          Request
        </button>
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} disabled={disabled} className="text-xs underline transition-opacity hover:opacity-70 disabled:opacity-40" style={{ color: MODE_COLORS.build.textMuted }}>
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={disabled}
          className="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
          style={{ background: MODE_COLORS.build.active }}
        >
          Looks good — continue
        </button>
      </div>
    </div>
  );
}

const BUILD_NODE_ICON: Record<BuildPlanNode["nodeType"], string> = { Workspace: "📁", Document: "📄" };

function BuildPlanTree({ nodes, depth }: { nodes: BuildPlanNode[]; depth: number }) {
  return (
    <ul className="flex flex-col gap-1.5" style={{ marginLeft: depth === 0 ? 0 : 16 }}>
      {nodes.map((node, i) => (
        <li key={i}>
          <div className="flex items-start gap-1.5">
            <span className="shrink-0">{BUILD_NODE_ICON[node.nodeType]}</span>
            <div className="min-w-0">
              <p className="font-medium text-gray-900">
                {node.name}
                {node.isRequirementsDocument && (
                  <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                    Requirements
                  </span>
                )}
              </p>
              <p className="text-gray-500">{node.description}</p>
            </div>
          </div>
          {node.children && node.children.length > 0 && <BuildPlanTree nodes={node.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

/** Stage 3 — read-only tree preview + a prompt box for small adjustments (sent as a normal chat
 *  message; the model re-calls propose_build_plan with an updated tree) + Back to Stage 2. */
function TreePreviewPanel({
  plan, disabled, onRequestChange, onBack, onApprove,
}: { plan: BuildPlanNode[]; disabled: boolean; onRequestChange: (text: string) => void; onBack: () => void; onApprove: () => void }) {
  const [adjustment, setAdjustment] = useState("");
  return (
    <div className="flex flex-col gap-3 px-4 py-3 border-t border-gray-100" style={{ background: MODE_COLORS.build.soft }}>
      <p className="text-xs font-semibold" style={{ color: MODE_COLORS.build.text }}>Proposed structure:</p>
      <div className="max-h-56 overflow-y-auto rounded-lg bg-white px-3 py-2 text-xs" style={{ border: `1px solid ${MODE_COLORS.build.border}` }}>
        <BuildPlanTree nodes={plan} depth={0} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={adjustment}
          onChange={(e) => setAdjustment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && adjustment.trim() && !disabled) {
              onRequestChange(adjustment.trim());
              setAdjustment("");
            }
          }}
          placeholder="Request a change, e.g. &quot;move the bolts under Fasteners&quot;"
          className="flex-1 rounded-lg px-2 py-1.5 text-xs outline-none"
          style={{ border: `1px solid ${MODE_COLORS.build.border}` }}
        />
        <button
          onClick={() => { if (adjustment.trim()) { onRequestChange(adjustment.trim()); setAdjustment(""); } }}
          disabled={disabled || !adjustment.trim()}
          className="shrink-0 rounded px-2 py-1.5 text-xs text-white transition-colors disabled:opacity-40"
          style={{ background: MODE_COLORS.build.active }}
        >
          Request
        </button>
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} disabled={disabled} className="text-xs underline transition-opacity hover:opacity-70 disabled:opacity-40" style={{ color: MODE_COLORS.build.textMuted }}>
          Back
        </button>
        <button
          onClick={onApprove}
          disabled={disabled}
          className="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
          style={{ background: MODE_COLORS.build.active }}
        >
          Looks good — continue
        </button>
      </div>
    </div>
  );
}

/** Stage 5 — final confirm. Creates every proposed node as a real file (empty for now — Stage
 *  6, right after this, writes real content and wires FileImports into each one). */
function BuildConfirmPanel({
  plan, isBuilding, error, onBack, onConfirm,
}: { plan: BuildPlanNode[]; isBuilding: boolean; error: string | null; onBack: () => void; onConfirm: () => void }) {
  const count = countBuildPlanNodes(plan);
  return (
    <div className="flex flex-col gap-3 px-4 py-3 border-t border-gray-100" style={{ background: MODE_COLORS.build.soft }}>
      <p className="text-xs" style={{ color: MODE_COLORS.build.text }}>
        This creates <strong>{count}</strong> item{count === 1 ? "" : "s"} in the structure shown. Content
        generation for each document follows immediately after.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-between">
        <button onClick={onBack} disabled={isBuilding} className="text-xs underline transition-opacity hover:opacity-70 disabled:opacity-40" style={{ color: MODE_COLORS.build.textMuted }}>
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={isBuilding}
          className="rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
          style={{ background: MODE_COLORS.build.active }}
        >
          {isBuilding ? "Creating…" : "Create these files"}
        </button>
      </div>
    </div>
  );
}

const GENERATION_STATUS_ICON: Record<GenerationStatus, string> = {
  pending: "○",
  generating: "◐",
  done: "✓",
  failed: "✕",
  content_written_resolve_failed: "⚠",
};

const GENERATION_STATUS_COLOR: Record<GenerationStatus, string> = {
  pending: "#9ca3af",
  generating: "#d97706",
  done: "#059669",
  failed: "#dc2626",
  content_written_resolve_failed: "#dc2626",
};

/** Stage 6 — the only stage with no model turn involved: a plain sequential client-side loop
 *  (one request per document) that this panel just reflects via live per-row status, not a
 *  conversation the user watches unfold. "Finish" resets the wizard (clearMessages) once every
 *  item is in a terminal state — the user can also leave it mid-run and come back via the
 *  stage indicator. */
function GenerationProgressPanel({
  docs, isGenerating, error, onStart, onRetry, onFinish,
}: {
  docs: GeneratedDocState[]; isGenerating: boolean; error: string | null;
  onStart: () => void; onRetry: (fileId: string) => void; onFinish: () => void;
}) {
  const started = docs.some((d) => d.status !== "pending");
  const allTerminal = docs.length > 0 && docs.every((d) => d.status === "done" || d.status === "failed" || d.status === "content_written_resolve_failed");
  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-t border-gray-100" style={{ background: MODE_COLORS.build.soft }}>
      <p className="text-xs font-semibold" style={{ color: MODE_COLORS.build.text }}>Generate content:</p>
      {error && (
        <p className="rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>
      )}
      <div className="flex flex-col gap-1.5">
        {docs.map((doc) => (
          <div key={doc.fileId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-xs" style={{ border: `1px solid ${MODE_COLORS.build.border}` }}>
            <div className="min-w-0 flex-1">
              <span style={{ color: GENERATION_STATUS_COLOR[doc.status] }} className="mr-1.5 font-mono">
                {GENERATION_STATUS_ICON[doc.status]}
              </span>
              <span className="truncate font-medium text-gray-900">{doc.name}</span>
              {doc.isRequirementsDocument && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                  Requirements
                </span>
              )}
              {doc.error && <p className="text-gray-500">{doc.error}</p>}
            </div>
            {(doc.status === "failed" || doc.status === "content_written_resolve_failed") && (
              <button
                onClick={() => onRetry(doc.fileId)}
                disabled={isGenerating}
                className="shrink-0 rounded px-2 py-1 text-white transition-colors disabled:opacity-40"
                style={{ background: MODE_COLORS.build.active }}
              >
                Retry
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={allTerminal ? onFinish : onStart}
        disabled={isGenerating || (started && !allTerminal)}
        className="self-end rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
        style={{ background: MODE_COLORS.build.active }}
      >
        {isGenerating ? "Generating…" : allTerminal ? "Finish" : "Generate content"}
      </button>
    </div>
  );
}

export default function ChatPanel() {
  const {
    isOpen, messages, isLoading, selectedBlock, mode, canBuild,
    toggleChat, openChat, setMode, sendMessage, clearMessages, clearSelectedBlock,
    approveProposal, rejectProposal, undoProposal,
    buildStage, setBuildStage, buildCandidates, proposedRequirements, proposedBuildPlan,
    isBuildingFiles, buildError, confirmBuild,
    buildDocuments, isGeneratingContent, generationError, runContentGeneration,
    retryDocument,
  } = useChat();
  const [input, setInput] = useState("");
  const [hexHover, setHexHover] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageType = derivePageType(usePathname());
  // Document and Part Tree both get the full Overview/Inspect/Build mode-switcher cluster;
  // Workspace/Dataset stay on the simpler single-hexagon toggle (no mode concept there).
  const usesModeCluster = pageType === "document" || pageType === "part-tree";
  const generalSuggestions = GENERAL_SUGGESTIONS_BY_PAGE_TYPE[pageType] ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  // Inspect mode locks the panel to whatever's selected: its top aligns with the selected
  // block's top (instead of floating below the mode cluster), with a line drawn from the block
  // to the panel to make the connection visible. Tracked as a DOM rect rather than something
  // computed from selectedBlock's own fields, since it's the block's actual on-screen position
  // that matters here — re-measured on scroll/resize so it stays correct as the page moves.
  // The `true` on the scroll listener is a capture-phase subscription: scroll events don't
  // bubble, so this is what lets a single window-level listener catch scrolling inside the
  // document's own inner scroll container, not just the window itself.
  const [blockAnchor, setBlockAnchor] = useState<{ top: number; right: number } | null>(null);
  useEffect(() => {
    if (mode !== "inspect" || !selectedBlock) {
      setBlockAnchor(null);
      return;
    }
    const update = () => {
      const el = document.getElementById(selectedBlock.id);
      setBlockAnchor(el ? { top: el.getBoundingClientRect().top, right: el.getBoundingClientRect().right } : null);
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [mode, selectedBlock]);

  const panelTop = blockAnchor
    ? Math.max(16, Math.min(blockAnchor.top, window.innerHeight - 200))
    : CLUSTER_TOP + CLUSTER_H + 16;
  const panelLeft = typeof window !== "undefined" ? window.innerWidth - CLUSTER_RIGHT - WINDOW_W : 0;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    await sendMessage(trimmed, window.location.pathname);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt, window.location.pathname);
  };

  // Identical either way (nothing about the mode redesign touched this), so computed once and
  // shared by both branches below rather than duplicated.
  const messagesSection = (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      {messages.length === 0 && (
        <p className="text-sm text-gray-400 text-center mt-8">
          Ask anything about Engentic or describe a structure you want to build.
        </p>
      )}
      <div className="flex flex-col gap-6">
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="self-end max-w-[85%] border-r-2 border-emerald-400 pr-3 text-right">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <HexBadge size={22} iconSize={11} />
              <div className="flex-1 min-w-0 text-sm text-gray-800 prose prose-sm max-w-none pt-0.5">
                {msg.content === "" && isLoading ? (
                  <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" />
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
                {msg.proposals && msg.proposals.length > 0 && (() => {
                  // Successfully-applied adds (new blocks) get folded into one summary,
                  // no individual Undo — the user asked for adds to just be visible, not
                  // individually actionable in chat (edits keep their own Undo below,
                  // and a *failed* add still gets its own card since that needs attention).
                  const isAdd = (p: BlockProposal) => !p.input.targetBlockId;
                  const addedSummary = msg.proposals.filter((p) => isAdd(p) && p.status === "applied");
                  const individual = msg.proposals.filter((p) => !(isAdd(p) && p.status === "applied"));
                  return (
                    <div className="not-prose mt-3 flex flex-col gap-2">
                      {addedSummary.length > 0 && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                          <p className="mb-1 font-semibold text-emerald-800">
                            Added {addedSummary.length} block{addedSummary.length === 1 ? "" : "s"}:
                          </p>
                          <ul className="flex flex-col gap-0.5">
                            {addedSummary.map((p) => (
                              <li key={p.id} className="text-gray-700">
                                <span className="font-medium text-emerald-700">{PROPOSAL_LABELS[p.tool]}</span>
                                {" — "}
                                <span className="font-mono break-words">{proposalPreview(p)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {individual.map((p) => (
                        <div key={p.id} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="font-semibold text-emerald-800">
                              {PROPOSAL_LABELS[p.tool]}
                              {BLOCK_TOOLS.has(p.tool) && <> · {p.input.targetBlockId ? "edit" : "add"}</>}
                            </span>
                            {p.status !== "pending" && (
                              <span className={
                                p.status === "approved" || p.status === "applied" ? "text-emerald-600" :
                                p.status === "failed" ? "text-red-500" : "text-gray-400"
                              }>
                                {p.status === "approved" || p.status === "applied" ? "Applied" :
                                 p.status === "failed" ? "Failed" :
                                 p.status === "undone" ? "Undone" : "Dismissed"}
                              </span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap break-words font-mono text-gray-700">
                            {proposalPreview(p)}
                          </p>
                          {p.status === "failed" && p.error && (
                            <p className="mt-1 text-red-500">{p.error}</p>
                          )}
                          {p.status === "pending" && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => approveProposal(i, p.id)}
                                className="rounded bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectProposal(i, p.id)}
                                className="rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {/* Document edits only — applied automatically, no click needed;
                              this is the only way back until Save clears every flag. Adds
                              never reach here since a successfully-applied one is filtered
                              into addedSummary above, with no Undo offered. */}
                          {p.status === "applied" && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => undoProposal(i, p.id)}
                                className="rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                              >
                                Undo
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ),
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );

  // ─── Workspace / Dataset: the original single-hexagon toggle, unchanged ───────────────────
  if (!usesModeCluster) {
    const lit = hexHover || isOpen;
    const iconColor = lit ? "#059669" : "#374151";
    return (
      <>
        {/* Connecting line — hex to chat window, matches the nav's hex-to-subcluster lines */}
        <div
          style={{
            position: "fixed",
            bottom: LINE_BOTTOM,
            right: HEX_RIGHT + HEX_W / 2 - 0.5,
            width: 1,
            height: LINE_GAP,
            background: "rgba(156,163,175,0.5)",
            zIndex: 48,
            pointerEvents: "none",
            opacity: isOpen ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}
        />

        {/* Toggle button — hexagon, reproducing the main nav hexagon look */}
        <button
          onClick={toggleChat}
          onMouseEnter={() => setHexHover(true)}
          onMouseLeave={() => setHexHover(false)}
          aria-label="Toggle chat"
          style={{
            position: "fixed",
            bottom: HEX_BOTTOM,
            right: HEX_RIGHT,
            width: HEX_W,
            height: HEX_H,
            zIndex: 50,
            cursor: "pointer",
            transform: lit ? "scale(1.1) translateZ(0)" : "scale(1) translateZ(0)",
            transition: "transform 0.2s cubic-bezier(.34,1.56,.64,1), filter 0.2s ease",
            filter: lit
              ? "drop-shadow(0 0 12px rgba(16,185,129,0.65)) drop-shadow(0 4px 10px rgba(0,0,0,0.3))"
              : "drop-shadow(0 3px 8px rgba(0,0,0,0.2)) drop-shadow(0 1px 3px rgba(0,0,0,0.12))",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -4,
              clipPath: HEX_CLIP,
              background: lit ? "rgba(16,185,129,0.15)" : "transparent",
              transition: "background 0.2s",
            }}
          />
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              clipPath: HEX_CLIP,
              background: lit
                ? "linear-gradient(145deg, #f0fdf9 0%, #d1fae5 100%)"
                : "linear-gradient(145deg, #ffffff 0%, #f2f2f2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                clipPath: HEX_CLIP,
                background: lit
                  ? "linear-gradient(160deg, rgba(255,255,255,0.5) 0%, transparent 50%)"
                  : "linear-gradient(160deg, rgba(255,255,255,0.85) 0%, transparent 50%)",
                pointerEvents: "none",
              }}
            />
            {isOpen ? (
              <X size={30} style={{ color: iconColor, position: "relative", transition: "color 0.2s" }} />
            ) : (
              <Bot size={30} style={{ color: iconColor, position: "relative", transition: "color 0.2s" }} />
            )}
          </div>
        </button>

        {/* Chat panel — docked column: a normal flex sibling of <main>, not a floating
            overlay, so it reflows the page instead of covering it. */}
        {isOpen && (
          <div
            className="h-screen shrink-0 border-l border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden"
            style={{ width: WINDOW_W }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                <HexBadge size={34} iconSize={16} />
                <span className="text-md font-semibold tracking-wide">April AI - Engentic Assistant</span>
              </div>
              <button
                onClick={clearMessages}
                className="text-emerald-200 hover:text-white transition-colors"
                aria-label="Clear conversation"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {messagesSection}

            {/* Selected-block chip + quick actions, or general quick actions when nothing's selected */}
            {selectedBlock ? (
              <div className="border-t border-gray-100 shrink-0">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-xs text-emerald-900">
                  <span className="font-semibold uppercase tracking-wide text-emerald-700 shrink-0">
                    {selectedBlock.type}
                  </span>
                  <span className="truncate flex-1 font-medium">{selectedBlock.name}</span>
                  <span className="text-emerald-600 truncate max-w-[35%] shrink-0">in &ldquo;{selectedBlock.location}&rdquo;</span>
                  <button
                    onClick={clearSelectedBlock}
                    className="text-emerald-500 hover:text-emerald-800 transition-colors shrink-0"
                    aria-label="Clear selection"
                  >
                    <X size={13} />
                  </button>
                </div>
                {SELECTED_SUGGESTIONS[selectedBlock.type]?.length ? (
                  <div className="flex flex-wrap gap-2 px-4 py-2 bg-emerald-50/60">
                    {SELECTED_SUGGESTIONS[selectedBlock.type].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSuggestion(s)}
                        disabled={isLoading}
                        className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : generalSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-gray-100 shrink-0">
                {generalSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    disabled={isLoading}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Input — larger compose area */}
            <div className="border-t border-gray-200 px-4 py-4 flex gap-2 items-end shrink-0">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question or describe a structure..."
                rows={3}
                className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 max-h-48 overflow-y-auto"
                style={{ minHeight: "72px" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ─── Document / Part Tree: mode-switcher cluster + block-aware floating panel ──────────────
  // blockAnchor's DOM lookup (below) only resolves for Document today (its blocks set
  // id={block.id}; part-tree rows don't yet) — for part-tree this just falls back to the default
  // cluster-anchored position instead of locking to the selected row on screen, which is an
  // acceptable simplification, not a bug.
  return (
    <>
      {/* Mode-switcher cluster — upper right, mirroring the always-present main nav cluster
          (SideMenuNew.tsx, lower left). There's no separate chat toggle — clicking any mode
          hexagon both sets that mode and opens the chat if it wasn't already; closing happens
          via the panel's own close button. */}
      <div
        style={{
          position: "fixed",
          top: CLUSTER_TOP,
          right: CLUSTER_RIGHT,
          width: CLUSTER_W,
          height: CLUSTER_H,
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        {(Object.keys(MODE_POS) as ChatMode[]).map((m) => (
          <ModeHex
            key={m}
            mode={m}
            pos={MODE_POS[m]}
            active={mode === m}
            onClick={() => { setMode(m); openChat(); }}
          />
        ))}
      </div>

      {/* Connecting line — inspect mode only, from the selected block to the panel's now-
          locked-in top edge, echoing the block-to-subcluster lines used elsewhere in the app.
          Drawn at panelTop (the clamped position), not blockAnchor.top directly — once the
          block scrolls offscreen, the panel stays clamped to the nearest visible edge, and the
          line needs to end there too, or it'd point off into empty space above/below the
          viewport instead of at the panel that's actually still on screen. */}
      {isOpen && blockAnchor && (
        <div
          style={{
            position: "fixed",
            top: panelTop,
            left: blockAnchor.right,
            width: Math.max(0, panelLeft - blockAnchor.right),
            height: 1,
            background: MODE_COLORS.inspect.active,
            zIndex: 48,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Chat panel — floating card, anchored below the mode cluster by default, or locked to
          the top of the selected block while one is selected in inspect mode (see blockAnchor
          above). Bounded height instead of h-screen; the page underneath is no longer reflowed.
          No header bar — mode is already communicated by the cluster's color, and the
          border-left below repeats that same signal. */}
      {isOpen && (
        <div
          className="bg-white shadow-2xl flex flex-col overflow-hidden rounded-xl"
          style={{
            position: "fixed",
            top: panelTop,
            right: CLUSTER_RIGHT,
            width: WINDOW_W,
            maxHeight: "70vh",
            zIndex: 49,
            transition: "top 0.2s ease",
          }}
        >
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button
              onClick={clearMessages}
              className="text-gray-400 hover:text-gray-700 transition-colors bg-white/80 rounded-md p-1"
              aria-label="Clear conversation"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={toggleChat}
              className="text-gray-400 hover:text-gray-700 transition-colors bg-white/80 rounded-md p-1"
              aria-label="Close chat"
            >
              <X size={15} />
            </button>
          </div>

          {messagesSection}

          {!canBuild && (
            <div
              className="flex items-center gap-1.5 px-4 py-2 text-xs shrink-0"
              style={{
                background: MODE_COLORS[mode].soft,
                color: MODE_COLORS[mode].textMuted,
                borderTop: `1px solid ${MODE_COLORS[mode].border}`,
              }}
            >
              <Lock size={12} className="shrink-0" />
              {pageType === "document"
                ? "You can look around and ask questions, but nothing can be changed until this document is checked out."
                : "You can look around and ask questions, but nothing can be changed without edit access."}
            </div>
          )}

          {/* Part Tree's 6-stage Build wizard — Document's Build mode (free-form block adds)
              doesn't use this at all, hence the pageType guard. Stage 1 has no dedicated UI
              beyond the prompt box below; 2-6 render here once their data exists. */}
          {pageType === "part-tree" && mode === "build" && canBuild && (
            <>
              <BuildStageIndicator
                stage={buildStage}
                hasCandidates={buildCandidates.length > 0 || buildStage >= 2}
                hasRequirements={proposedRequirements !== null || buildStage >= 3}
                hasTree={!!proposedBuildPlan}
                hasDocuments={buildDocuments.length > 0 || buildStage >= 6}
                onJump={setBuildStage}
              />
              {buildStage === 2 && (
                <CandidateCards
                  candidates={buildCandidates}
                  disabled={isLoading}
                  onSelect={(c) => sendMessage(`Use "${c.name}" (id ${c.fileId}) as the reference part tree.`, window.location.pathname)}
                  onSkip={() => sendMessage("None of these are close enough — continue without a reference.", window.location.pathname)}
                />
              )}
              {buildStage === 3 && proposedRequirements && (
                <RequirementsReviewPanel
                  items={proposedRequirements}
                  disabled={isLoading}
                  onContinue={() => sendMessage("These requirements documents look good — continue with the full plan.", window.location.pathname)}
                  onRequestChange={(text) => sendMessage(text, window.location.pathname)}
                  onAddRequirement={(description) => sendMessage(`Yes, add a requirements document: ${description}`, window.location.pathname)}
                  onSkip={() => sendMessage("No requirements document is needed — continue with the full plan.", window.location.pathname)}
                  onBack={() => setBuildStage(2)}
                />
              )}
              {buildStage === 4 && proposedBuildPlan && (
                <TreePreviewPanel
                  plan={proposedBuildPlan.nodes}
                  disabled={isLoading}
                  onRequestChange={(text) => sendMessage(text, window.location.pathname)}
                  onBack={() => setBuildStage(3)}
                  onApprove={() => setBuildStage(5)}
                />
              )}
              {buildStage === 5 && proposedBuildPlan && (
                <BuildConfirmPanel
                  plan={proposedBuildPlan.nodes}
                  isBuilding={isBuildingFiles}
                  error={buildError}
                  onBack={() => setBuildStage(4)}
                  onConfirm={confirmBuild}
                />
              )}
              {buildStage === 6 && (
                <GenerationProgressPanel
                  docs={buildDocuments}
                  isGenerating={isGeneratingContent}
                  error={generationError}
                  onStart={runContentGeneration}
                  onRetry={retryDocument}
                  onFinish={clearMessages}
                />
              )}
            </>
          )}

          {/* Input — larger compose area. Hidden entirely in Build mode without canBuild —
              there's nothing productive to type, since Build's whole point is adding/changing
              things and that's exactly what's blocked; the notice above already explains why. */}
          {!(mode === "build" && !canBuild) && (
            <div className="border-t border-gray-200 px-4 py-4 flex gap-2 items-end shrink-0">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question or describe a structure..."
                rows={3}
                className="flex-1 resize-none rounded-lg px-3 py-2.5 text-sm outline-none max-h-48 overflow-y-auto transition-colors"
                style={{ minHeight: "72px", border: `1.5px solid ${MODE_COLORS[mode].border}` }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-lg text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                style={{ background: MODE_COLORS[mode].active }}
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          )}

          {/* Selected-block chip + quick actions, or general quick actions when nothing's selected */}
          {mode === "inspect" && selectedBlock ? (
            <div className="border-t border-gray-100 shrink-0">
              {SELECTED_SUGGESTIONS[selectedBlock.type]?.length ? (
                <div className="flex flex-wrap gap-2 px-4 py-2" style={{ background: MODE_COLORS[mode].soft }}>
                  {SELECTED_SUGGESTIONS[selectedBlock.type].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      disabled={isLoading}
                      className="rounded-full bg-white px-3 py-1 text-xs transition-opacity hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ border: `1px solid ${MODE_COLORS[mode].border}`, color: MODE_COLORS[mode].text }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
              <div
                className="flex items-center gap-2 px-4 py-2 text-xs"
                style={{ background: MODE_COLORS[mode].soft, color: MODE_COLORS[mode].text }}
              >
                {/* position/total is Document-only — a block's place in its linear sequence.
                    Part trees (and any future non-linear page type) have no such ordering. */}
                {pageType === "document" && (
                  <span className="font-mono shrink-0" style={{ color: MODE_COLORS[mode].textMuted }}>
                    {selectedBlock.position} / {selectedBlock.total}
                  </span>
                )}
                <span className="font-semibold uppercase tracking-wide shrink-0" style={{ color: MODE_COLORS[mode].active }}>
                  {selectedBlock.type}
                </span>
                <span className="truncate flex-1 font-medium">{selectedBlock.name}</span>
                <span className="truncate max-w-[35%] shrink-0" style={{ color: MODE_COLORS[mode].textMuted }}>
                  in &ldquo;{selectedBlock.location}&rdquo;
                </span>
                <button
                  onClick={clearSelectedBlock}
                  className="transition-opacity hover:opacity-60 shrink-0"
                  style={{ color: MODE_COLORS[mode].textMuted }}
                  aria-label="Clear selection"
                >
                  <X size={13} />
                </button>
              </div>
              {/* detail is also Document-only — for part-tree it's just a copy of the chip
                  line above (PartTreeWrapper.tsx sets detail = contextLine), so showing it here
                  would just repeat the same summary twice. */}
              {pageType === "document" && selectedBlock.detail && (
                <div
                  className="truncate px-4 pb-2 text-[11px]"
                  style={{ background: MODE_COLORS[mode].soft, color: MODE_COLORS[mode].textMuted }}
                >
                  {selectedBlock.detail}
                </div>
              )}
            </div>
          ) : mode !== "build" && generalSuggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-gray-100 shrink-0">
              {generalSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  disabled={isLoading}
                  className="rounded-full bg-white px-3 py-1 text-xs transition-opacity hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ border: `1px solid ${MODE_COLORS[mode].border}`, color: MODE_COLORS[mode].text }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
