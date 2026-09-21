"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { Bot, X, Send, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useChat, type BlockProposal } from "@/context/ChatContext";

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
// (components/side-menu/SideMenuNew.tsx: HEX_CLIP / HexNav)
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
const HEX_W = 76;
const HEX_H = (HEX_W * 2) / Math.sqrt(3); // ≈ 64.66 — pointy-top hexagon aspect ratio
const HEX_BOTTOM = 24; // matches the old bottom-6 toggle position
const HEX_RIGHT = 24; // matches the old right-6 toggle position
const LINE_GAP = 30; // same connecting-line gap used between nav hexagons and their sub-clusters
const LINE_BOTTOM = HEX_BOTTOM + HEX_H;
const WINDOW_W = 600;

// The original 4 block tools are the only ones with an edit-vs-add distinction
// (targetBlockId present/absent) — every tool added since is a one-shot action, so this set
// is what gates showing that "· edit"/"· add" suffix at the render site below.
const BLOCK_TOOLS = new Set<BlockProposal["tool"]>([
  "equation_block", "symbolic_equation_block", "text_block", "header_block", "if_else_block",
]);

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
};

// Shown instead, when nothing is selected — page-wide asks rather than single-block ones,
// keyed by page type since each page type supports different things (documents: block Q&A;
// workspace: browse + create_file; dataset: read-only Q&A; part-tree: nothing yet).
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
  "part-tree": [],
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

export default function ChatPanel() {
  const {
    isOpen, messages, isLoading, selectedBlock,
    toggleChat, sendMessage, clearMessages, clearSelectedBlock,
    approveProposal, rejectProposal, undoProposal,
  } = useChat();
  const [input, setInput] = useState("");
  const [hexHover, setHexHover] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pageType = derivePageType(usePathname());
  const generalSuggestions = GENERAL_SUGGESTIONS_BY_PAGE_TYPE[pageType] ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

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

  // Lit (green) whenever hovered or open — same treatment the nav hexagons use
  // for their own toggle-a-panel buttons (Add/Doc: variant "link" + active while open)
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
          overlay, so it reflows the page instead of covering it. Experimental swap from
          the popover layout; the chamfered clip-path is dropped here since it assumed a
          gap around the panel that a flush-docked edge doesn't have. */}
      {isOpen && (
        <div
          className="h-screen shrink-0 border-l border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden"
          style={{ width: WINDOW_W }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shrink-0">
            <div className="flex items-center gap-3">
              <HexBadge size={34} iconSize={16} />
              <span className="text-md font-semibold tracking-wide">April AI - CadWolf Assistant</span>
            </div>
            <button
              onClick={clearMessages}
              className="text-emerald-200 hover:text-white transition-colors"
              aria-label="Clear conversation"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Messages — flowing transcript, not chat bubbles */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {messages.length === 0 && (
              <p className="text-sm text-gray-400 text-center mt-8">
                Ask anything about CadWolf or describe a structure you want to build.
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
