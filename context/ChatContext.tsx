"use client";

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";

// Tool names executed server-side (app/api/chat/route.ts) and already resolved before the
// model's final answer — there's nothing for the user to approve, so these never become a
// BlockProposal (no card, no Approve/Reject). Hardcoded here rather than imported from
// app/api/chat/tools.ts, which pulls in server-only modules that can't reach a client bundle
// (same reason ChatPanel.tsx duplicates its own small constants instead of importing from
// route.ts).
const SERVER_EXECUTED_TOOL_NAMES = new Set(["search_documents", "read_document", "read_part_tree", "find_similar_part_trees"]);

/** A block-add/edit (or, for create_file, a real file creation) proposed by a tool call —
 *  not yet applied/executed until the user approves it. */
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

export interface BlockProposal {
  /** The tool_use id from the API response — stable identity for approve/reject. */
  id: string;
  tool: ProposalToolName;
  /** Raw tool input, shape depends on `tool`: block tools take
   *  { raw | expression | text, level?, targetBlockId?, anchorBlockId?, position? };
   *  if_else_block takes { branches: {type,conditions?,equations}[], targetBlockId?,
   *  anchorBlockId?, position? }; create_file takes { fileTypeId, name? }; rename_file takes
   *  { targetId, name }; move_file takes { targetId, destinationId }; delete_file takes
   *  { targetId }; configure_dataset_parsers takes { parsers: {label,separator}[] };
   *  edit_dataset_content takes { rawText }; edit_dataset_metadata takes { name?, description? }. */
  input: Record<string, unknown>;
  /** "applied"/"undone" are Document-only — its proposals auto-apply as a batch once the
   *  message finishes (see sendMessage/onAutoApplyBatch) instead of waiting for a click.
   *  Workspace/Dataset proposals still go through "pending" → "approved"/"rejected"/"failed". */
  status: "pending" | "approved" | "rejected" | "failed" | "applied" | "undone";
  /** Set when status is "failed" — a short reason to show in the proposal card. */
  error?: string;
}

/** Mutually-exclusive interaction modes: Overview (talk only, about the document as a whole —
 *  nothing can be selected), Inspect (talk about, and edit, one selected item), Build (talk +
 *  add new blocks/items). Switched via the hexagon cluster in ChatPanel.tsx. Not yet sent to
 *  the model itself — the Overview/Inspect distinction currently works entirely through
 *  whether a block is selected (Overview blocks selection outright), not through the model
 *  being told which mode is active; tool-gating by mode beyond Build is still future work. */
export type ChatMode = "overview" | "inspect" | "build";

/** Part-tree Build mode only: the 6-stage wizard (prompt → candidate selection →
 *  requirements review → tree review → build → generate content). Stage 1 has no dedicated UI
 *  beyond the normal prompt box; 2-6 render in ChatPanel.tsx once the corresponding data
 *  (buildCandidates / proposedRequirements / proposedBuildPlan / buildDocuments) exists. */
export type BuildStage = 1 | 2 | 3 | 4 | 5 | 6;

/** One candidate from find_similar_part_trees, parsed server-side from the same tool result the
 *  model itself receives (app/api/chat/route.ts's "candidates" event) — not a second lookup. */
export interface BuildCandidate {
  fileId: number;
  name: string;
  distance: number;
}

/** One item of a propose_requirements_review tool call — mirrors its input_schema in
 *  app/api/chat/tools.ts. Stage 3, between candidate selection and the full tree proposal. */
export interface RequirementItem {
  name: string;
  description: string;
  source: "reference" | "inferred_from_prompt";
  sourceFileId?: number;
}

/** One node of a propose_build_plan tool call — mirrors BUILD_PLAN_NODE_PROPERTIES in
 *  app/api/chat/tools.ts. No ids yet; nothing has been created. */
export interface BuildPlanNode {
  name: string;
  nodeType: "Workspace" | "Document";
  isRequirementsDocument?: boolean;
  /** Id of a document in the reference part tree this node's content should be adapted from
   *  (Stage 6) — set by the model at Stage 4 when read_part_tree already showed a clear analog.
   *  Untrusted until Stage 6 actually resolves it (a bad/stale id just means no reference). */
  templateFileId?: number;
  description: string;
  children?: BuildPlanNode[];
}

export interface BuildPlan {
  nodes: BuildPlanNode[];
}

/** Stage 6 — one Document node from the approved tree, as content generation is working
 *  through it. "content_written_resolve_failed" is distinct from "failed" because its retry
 *  action must be different: blocks already exist, so retrying must re-run resolve only, never
 *  regenerate (which would duplicate them). */
export type GenerationStatus = "pending" | "generating" | "content_written_resolve_failed" | "done" | "failed";

export interface GeneratedDocState {
  fileId: string;
  name: string;
  isRequirementsDocument: boolean;
  status: GenerationStatus;
  error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Any block proposals this assistant message made — approved/rejected in place via their status. */
  proposals?: BlockProposal[];
}

/** Summary of the currently-selected document block, shown as a chip in the chat UI. */
export interface SelectedBlockInfo {
  /** The block's actual id — this is what a tool call's targetBlockId/anchorBlockId must use. */
  id: string;
  /** Human-readable block type, e.g. "Equation", "Text", "Header". */
  type: string;
  /** Variable name / heading text / short snippet — whatever identifies this block to a user. */
  name: string;
  /** Nearest preceding header's text, or "Top of document". */
  location: string;
  /** The same one-line formatted representation used in the full-page context dump. */
  contextLine: string;
  /** Short, chip-display-friendly summary of the block's content — generic per-type content
   *  (same source as contextLine) for most types, but a word count for TEXT specifically,
   *  since contextLine's raw HTML there isn't fit to show directly in the UI. */
  detail: string;
  /** 1-based position of this block among the document's current (non-deleted) blocks. */
  position: number;
  /** Total count of the document's current (non-deleted) blocks. */
  total: number;
}

/** Registered by the page so the chat can apply/highlight proposals without owning page state
 *  itself — mirrors how selection clearing works via setSelectedBlock's onClear.
 *
 *  Two coexisting modes: Workspace/Dataset register onPropose/onApprove/onReject (unchanged
 *  since Steps 5/11) — proposals stay "pending" until the user clicks Approve/Reject on each
 *  card. Document instead registers onAutoApplyBatch/onUndo — every proposal in a message
 *  applies immediately once the message finishes, no click, with onUndo as the only way back.
 *  A page only ever sets one mode's fields. */
export interface DocumentProposalHandlers {
  /** Called as soon as a proposal streams in, so it can be highlighted on the canvas immediately.
   *  Workspace/Dataset only. */
  onPropose?: (proposal: BlockProposal) => void;
  /** May return a Promise and throw/reject — used by tools like create_file whose approval is a
   *  real network call that can fail (permission denied, etc.), unlike a document block edit which
   *  only touches local state and can't fail this way. approveProposal awaits this and only marks
   *  the proposal "approved" on success, "failed" otherwise. Workspace/Dataset only. */
  onApprove?: (proposal: BlockProposal) => void | Promise<void>;
  /** Workspace/Dataset only. */
  onReject?: (proposal: BlockProposal) => void;
  /** Document only. Called once per assistant message with every proposal from that message
   *  together (in presented order), immediately after the stream finishes — so add-type
   *  proposals can be positioned relative to each other and the document in one pass instead
   *  of one click at a time. Returns which ids actually applied vs. failed (and why), so
   *  sendMessage can set each proposal's final status without a second round-trip. */
  onAutoApplyBatch?: (proposals: BlockProposal[]) => Promise<{ appliedIds: string[]; failed: { id: string; error: string }[] }>;
  /** Document only. Reverses one already-applied proposal: removes the block for an add,
   *  restores its prior content for an edit. May throw/reject. */
  onUndo?: (proposal: BlockProposal) => void | Promise<void>;
  /** Part Tree Build mode only (Stage 5's confirm action). Walks the approved tree and creates
   *  each node as an empty file, parent-before-child. May throw/reject (e.g. a permission
   *  failure partway through) — confirmBuild surfaces that as buildError rather than silently
   *  resetting the wizard. Returns the flattened list of created Document nodes (Workspace
   *  nodes excluded — they have no content) so Stage 6 knows what to generate content for. */
  onConfirmBuild?: (tree: BuildPlan) => Promise<{ fileId: string; name: string; isRequirementsDocument: boolean }[]>;
  /** Part Tree Build mode only (Stage 6). Implements the actual two-pass (requirements docs,
   *  then parts) sequential generation loop, calling `onStatus` between each document so the
   *  UI can show live per-item progress. May throw for a run-level failure; a single document's
   *  failure should be reported via onStatus instead, not by throwing. */
  onGenerateDocuments?: (
    docs: GeneratedDocState[],
    onStatus: (fileId: string, status: GenerationStatus, error?: string) => void,
  ) => Promise<void>;
  /** Part Tree Build mode only (Stage 6, per-row retry). `doc` carries its pre-retry status —
   *  "content_written_resolve_failed" must retry by re-solving only (re-running generation
   *  would duplicate already-written blocks); any other failed status is safe to regenerate
   *  from scratch, since nothing was persisted yet. */
  onRetryDocument?: (doc: GeneratedDocState) => Promise<{ status: GenerationStatus; error?: string }>;
}

interface ChatContextType {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  selectedBlock: SelectedBlockInfo | null;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  /** Whether Build mode is currently allowed on this page — true by default (Workspace/Dataset
   *  have no checkout concept and never call setCanBuild); Document sets this to
   *  canEdit && checked-out-by-me, since adding blocks requires both. */
  canBuild: boolean;
  setCanBuild: (canBuild: boolean) => void;
  toggleChat: () => void;
  /** Unconditionally opens the chat — used by the mode hexagons, which should always end up
   *  with the panel open regardless of whether it already was (unlike toggleChat's flip). */
  openChat: () => void;
  sendMessage: (content: string, pagePath?: string) => Promise<void>;
  clearMessages: () => void;
  setPageContext: (context: string | null) => void;
  /** The numeric id of the file the user is currently on (part-tree pages only, for now) —
   *  sent with every chat request so the server can exclude it from find_similar_part_trees'
   *  own results (otherwise the current tree is its own closest embedding match). */
  setCurrentFileId: (id: number | null) => void;
  registerProposalHandlers: (handlers: DocumentProposalHandlers | null) => void;
  approveProposal: (messageIndex: number, proposalId: string) => void;
  rejectProposal: (messageIndex: number, proposalId: string) => void;
  /** Reverses an already-applied Document proposal (status "applied") via onUndo. */
  undoProposal: (messageIndex: number, proposalId: string) => void;
  /** Part Tree Build mode's 6-stage wizard. Jumping back to an earlier stage (clicking the
   *  stage indicator) is just setBuildStage directly — buildCandidates/proposedRequirements/
   *  proposedBuildPlan/buildDocuments are kept around rather than cleared, so going back and
   *  forward again doesn't lose data. */
  buildStage: BuildStage;
  setBuildStage: (stage: BuildStage) => void;
  buildCandidates: BuildCandidate[];
  proposedRequirements: RequirementItem[] | null;
  proposedBuildPlan: BuildPlan | null;
  /** True while onConfirmBuild's real file-creation calls are in flight. */
  isBuildingFiles: boolean;
  /** Set when onConfirmBuild throws — cleared on the next confirmBuild attempt. */
  buildError: string | null;
  /** Stage 5's confirm action: calls the registered onConfirmBuild with the current
   *  proposedBuildPlan, and on success populates buildDocuments and moves to Stage 6 (instead
   *  of resetting the wizard — that now happens when the user clicks "Finish" on Stage 6). */
  confirmBuild: () => Promise<void>;
  /** Stage 6 — one entry per Document node created in Stage 5, with live generation status. */
  buildDocuments: GeneratedDocState[];
  /** True while onGenerateDocuments' run is in flight. */
  isGeneratingContent: boolean;
  /** Run-level message (e.g. "N requirements documents failed") — distinct from a single
   *  document's own per-item error, shown as a persistent banner for the rest of the run. */
  generationError: string | null;
  /** Stage 6's "Generate content" action: calls the registered onGenerateDocuments over the
   *  current buildDocuments. Does not reset the wizard afterward — Stage 6 is a terminal
   *  summary screen; "Finish" (clearMessages) is the explicit way back to Stage 1. */
  runContentGeneration: () => Promise<void>;
  /** Updates one buildDocuments entry's status/error in place — passed to onGenerateDocuments
   *  as its onStatus callback. */
  updateDocumentStatus: (fileId: string, status: GenerationStatus, error?: string) => void;
  /** Per-row retry for one failed/content_written_resolve_failed document — calls the
   *  registered onRetryDocument with that document's current (pre-retry) state. */
  retryDocument: (fileId: string) => Promise<void>;
  /** Called by the document page whenever the selected block changes. `onClear` is invoked if the
   *  chat UI clears the selection itself (e.g. the chip's dismiss button), so the canvas selection
   *  stays in sync. */
  setSelectedBlock: (info: SelectedBlockInfo | null, onClear?: () => void) => void;
  clearSelectedBlock: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBlock, setSelectedBlockState] = useState<SelectedBlockInfo | null>(null);
  const [mode, setMode] = useState<ChatMode>("overview");
  const [canBuild, setCanBuild] = useState(true);
  const [buildStage, setBuildStage] = useState<BuildStage>(1);
  const [buildCandidates, setBuildCandidates] = useState<BuildCandidate[]>([]);
  const [proposedRequirements, setProposedRequirements] = useState<RequirementItem[] | null>(null);
  const [proposedBuildPlan, setProposedBuildPlan] = useState<BuildPlan | null>(null);
  const [isBuildingFiles, setIsBuildingFiles] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildDocuments, setBuildDocuments] = useState<GeneratedDocState[]>([]);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const pageContextRef = useRef<string | null>(null);
  const currentFileIdRef = useRef<number | null>(null);
  const clearSelectionRef = useRef<(() => void) | null>(null);
  const proposalHandlersRef = useRef<DocumentProposalHandlers | null>(null);
  const setPageContext = useCallback((context: string | null) => {
    pageContextRef.current = context;
  }, []);
  const setCurrentFileId = useCallback((id: number | null) => {
    currentFileIdRef.current = id;
  }, []);

  const setSelectedBlock = useCallback((info: SelectedBlockInfo | null, onClear?: () => void) => {
    setSelectedBlockState(info);
    clearSelectionRef.current = info ? (onClear ?? null) : null;
  }, []);

  const clearSelectedBlock = useCallback(() => {
    clearSelectionRef.current?.();
    clearSelectionRef.current = null;
    setSelectedBlockState(null);
  }, []);

  const registerProposalHandlers = useCallback((handlers: DocumentProposalHandlers | null) => {
    proposalHandlersRef.current = handlers;
  }, []);

  const setProposalStatus = useCallback(
    (messageIndex: number, proposalId: string, status: BlockProposal["status"], error?: string) => {
      setMessages((prev) => {
        const msg = prev[messageIndex];
        if (!msg?.proposals) return prev;
        const updated = [...prev];
        updated[messageIndex] = {
          ...msg,
          proposals: msg.proposals.map((p) => (p.id === proposalId ? { ...p, status, error } : p)),
        };
        return updated;
      });
    },
    [],
  );

  // Call the registered handler (which updates the page's own state, or — for tools like
  // create_file — makes a real API call) *before* touching setMessages, and never from inside
  // a setMessages updater — React treats a cross-component setState call made from within
  // another component's updater as "updating a component while rendering a different
  // component," even though this only ever runs from a click handler, never during an actual
  // render. onApprove may reject (a failed network call); only mark "approved" on success.
  const approveProposal = useCallback(async (messageIndex: number, proposalId: string) => {
    const proposal = messages[messageIndex]?.proposals?.find((p) => p.id === proposalId);
    if (!proposal || proposal.status !== "pending") return;
    try {
      // No handler registered (e.g. the page navigated away, or this page type/permission
      // level never registers one — a view-only workspace) means there's nothing to apply
      // this to. That must surface as a failure, not silently read as success.
      if (!proposalHandlersRef.current?.onApprove) throw new Error("This page isn't set up to apply this.");
      await proposalHandlersRef.current.onApprove(proposal);
      setProposalStatus(messageIndex, proposalId, "approved");
    } catch (err) {
      setProposalStatus(messageIndex, proposalId, "failed", err instanceof Error ? err.message : "Failed to apply.");
    }
  }, [messages, setProposalStatus]);

  const rejectProposal = useCallback((messageIndex: number, proposalId: string) => {
    const proposal = messages[messageIndex]?.proposals?.find((p) => p.id === proposalId);
    if (!proposal || proposal.status !== "pending") return;
    proposalHandlersRef.current?.onReject?.(proposal);
    setMessages((prev) => {
      const msg = prev[messageIndex];
      if (!msg?.proposals) return prev;
      const updated = [...prev];
      updated[messageIndex] = {
        ...msg,
        proposals: msg.proposals.map((p) => (p.id === proposalId ? { ...p, status: "rejected" as const } : p)),
      };
      return updated;
    });
  }, [messages]);

  const undoProposal = useCallback(async (messageIndex: number, proposalId: string) => {
    const proposal = messages[messageIndex]?.proposals?.find((p) => p.id === proposalId);
    if (!proposal || proposal.status !== "applied") return;
    try {
      if (!proposalHandlersRef.current?.onUndo) throw new Error("This page isn't set up to undo this.");
      await proposalHandlersRef.current.onUndo(proposal);
      setProposalStatus(messageIndex, proposalId, "undone");
    } catch (err) {
      setProposalStatus(messageIndex, proposalId, "failed", err instanceof Error ? err.message : "Failed to undo.");
    }
  }, [messages, setProposalStatus]);

  const toggleChat = useCallback(() => setIsOpen((v) => !v), []);
  const openChat = useCallback(() => setIsOpen(true), []);
  // A "new build conversation" is exactly "the user cleared the chat" — there's no other
  // signal for it, and reusing clearMessages keeps the wizard from drifting out of sync with
  // what the model can actually see (it has no memory of a cleared conversation either).
  const clearMessages = useCallback(() => {
    setMessages([]);
    setBuildStage(1);
    setBuildCandidates([]);
    setProposedRequirements(null);
    setProposedBuildPlan(null);
    setBuildError(null);
    setBuildDocuments([]);
    setGenerationError(null);
  }, []);

  const confirmBuild = useCallback(async () => {
    if (!proposedBuildPlan) return;
    setIsBuildingFiles(true);
    setBuildError(null);
    try {
      if (!proposalHandlersRef.current?.onConfirmBuild) throw new Error("This page isn't set up to build this.");
      const created = await proposalHandlersRef.current.onConfirmBuild(proposedBuildPlan);
      setBuildDocuments(created.map((d) => ({ ...d, status: "pending" as const })));
      setBuildStage(6);
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "Failed to build.");
    } finally {
      setIsBuildingFiles(false);
    }
  }, [proposedBuildPlan]);

  const updateDocumentStatus = useCallback((fileId: string, status: GenerationStatus, error?: string) => {
    setBuildDocuments((prev) => prev.map((d) => (d.fileId === fileId ? { ...d, status, error } : d)));
  }, []);

  const retryDocument = useCallback(async (fileId: string) => {
    const doc = buildDocuments.find((d) => d.fileId === fileId);
    if (!doc) return;
    updateDocumentStatus(fileId, "generating");
    try {
      if (!proposalHandlersRef.current?.onRetryDocument) throw new Error("This page isn't set up to retry this.");
      const result = await proposalHandlersRef.current.onRetryDocument(doc);
      updateDocumentStatus(fileId, result.status, result.error);
    } catch (err) {
      updateDocumentStatus(fileId, "failed", err instanceof Error ? err.message : "Retry failed.");
    }
  }, [buildDocuments, updateDocumentStatus]);

  const runContentGeneration = useCallback(async () => {
    setIsGeneratingContent(true);
    setGenerationError(null);
    try {
      if (!proposalHandlersRef.current?.onGenerateDocuments) throw new Error("This page isn't set up to generate content.");
      await proposalHandlersRef.current.onGenerateDocuments(buildDocuments, updateDocumentStatus);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Failed to generate content.");
    } finally {
      setIsGeneratingContent(false);
    }
  }, [buildDocuments, updateDocumentStatus]);

  const sendMessage = useCallback(async (content: string, pagePath?: string) => {
    const userMessage: ChatMessage = { role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);

    // Append empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const selectedBlockContext = selectedBlock
      ? `[User has this block selected — id "${selectedBlock.id}", ${selectedBlock.type} "${selectedBlock.name}" (in "${selectedBlock.location}"): ${selectedBlock.contextLine}]`
      : null;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Strip UI-only fields (proposals) — the Anthropic API only accepts role/content
        // and rejects unknown message properties.
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          pagePath,
          pageContext: pageContextRef.current,
          currentFileId: currentFileIdRef.current,
          selectedBlockContext,
          mode,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      // Collected so onAutoApplyBatch (Document only) can apply every proposal from this
      // message together in one pass once the stream ends, rather than one at a time.
      const batchProposals: BlockProposal[] = [];

      // NDJSON: one typed event per line. Buffer partial lines across chunk boundaries.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: { type: string; [key: string]: unknown };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === "text") {
            const textDelta = event.text as string;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + textDelta };
              }
              return updated;
            });
          } else if (event.type === "tool_use") {
            if (SERVER_EXECUTED_TOOL_NAMES.has(event.name as string)) continue;
            const input = { ...(event.input as Record<string, unknown>) };
            // Robustness fallback: if this is an add (no targetBlockId) and the model didn't
            // set an anchor, but a block was selected when the request was sent, anchor there
            // instead of silently falling back to "end of document" — matches what the user
            // almost certainly meant by "add this below/above" even if the model forgot to
            // carry the id through.
            if (!input.targetBlockId && !input.anchorBlockId && selectedBlock) {
              input.anchorBlockId = selectedBlock.id;
              input.position ??= "after";
            }
            const proposal: BlockProposal = {
              id: event.id as string,
              tool: event.name as ProposalToolName,
              input,
              status: "pending",
            };
            batchProposals.push(proposal);
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, proposals: [...(last.proposals ?? []), proposal] };
              }
              return updated;
            });
            proposalHandlersRef.current?.onPropose?.(proposal);
          } else if (event.type === "candidates") {
            setBuildCandidates(event.items as BuildCandidate[]);
            setBuildStage(2);
          } else if (event.type === "requirements_proposal") {
            setProposedRequirements(event.items as RequirementItem[]);
            setBuildStage(3);
          } else if (event.type === "tree_proposal") {
            setProposedBuildPlan(event.tree as BuildPlan);
            setBuildStage(4);
          } else if (event.type === "error") {
            const message = event.message as string;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant" && !last.content) {
                updated[updated.length - 1] = { ...last, content: message || "Something went wrong." };
              }
              return updated;
            });
          }
        }
      }

      // Document only (see onAutoApplyBatch's doc comment) — Workspace/Dataset don't set
      // this, so their proposals stay "pending" for the existing per-card Approve/Reject flow.
      if (batchProposals.length > 0 && proposalHandlersRef.current?.onAutoApplyBatch) {
        try {
          const result = await proposalHandlersRef.current.onAutoApplyBatch(batchProposals);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant" && last.proposals) {
              updated[updated.length - 1] = {
                ...last,
                proposals: last.proposals.map((p) => {
                  if (result.appliedIds.includes(p.id)) return { ...p, status: "applied" as const };
                  const failure = result.failed.find((f) => f.id === p.id);
                  return failure ? { ...p, status: "failed" as const, error: failure.error } : p;
                }),
              };
            }
            return updated;
          });
        } catch (err) {
          // The batch call itself threw (not a per-item failure) — none of them are known
          // to have applied, so mark every proposal from this batch failed.
          const message = err instanceof Error ? err.message : "Failed to apply.";
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant" && last.proposals) {
              updated[updated.length - 1] = {
                ...last,
                proposals: last.proposals.map((p) =>
                  batchProposals.some((bp) => bp.id === p.id) ? { ...p, status: "failed" as const, error: message } : p,
                ),
              };
            }
            return updated;
          });
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant" && last.content === "") {
          updated[updated.length - 1] = {
            ...last,
            content: "Something went wrong. Please try again.",
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedBlock, mode]);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        messages,
        isLoading,
        selectedBlock,
        mode,
        setMode,
        canBuild,
        setCanBuild,
        toggleChat,
        openChat,
        sendMessage,
        clearMessages,
        setPageContext,
        setCurrentFileId,
        setSelectedBlock,
        clearSelectedBlock,
        registerProposalHandlers,
        approveProposal,
        rejectProposal,
        undoProposal,
        buildStage,
        setBuildStage,
        buildCandidates,
        proposedRequirements,
        proposedBuildPlan,
        isBuildingFiles,
        buildError,
        confirmBuild,
        buildDocuments,
        isGeneratingContent,
        generationError,
        runContentGeneration,
        updateDocumentStatus,
        retryDocument,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
