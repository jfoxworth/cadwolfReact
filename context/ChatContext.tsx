"use client";

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";

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
  registerProposalHandlers: (handlers: DocumentProposalHandlers | null) => void;
  approveProposal: (messageIndex: number, proposalId: string) => void;
  rejectProposal: (messageIndex: number, proposalId: string) => void;
  /** Reverses an already-applied Document proposal (status "applied") via onUndo. */
  undoProposal: (messageIndex: number, proposalId: string) => void;
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
  const pageContextRef = useRef<string | null>(null);
  const clearSelectionRef = useRef<(() => void) | null>(null);
  const proposalHandlersRef = useRef<DocumentProposalHandlers | null>(null);
  const setPageContext = useCallback((context: string | null) => {
    pageContextRef.current = context;
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
  const clearMessages = useCallback(() => setMessages([]), []);

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
        setSelectedBlock,
        clearSelectedBlock,
        registerProposalHandlers,
        approveProposal,
        rejectProposal,
        undoProposal,
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
