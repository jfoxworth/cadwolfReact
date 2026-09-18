"use client";

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Summary of the currently-selected document block, shown as a chip in the chat UI. */
export interface SelectedBlockInfo {
  /** Human-readable block type, e.g. "Equation", "Text", "Header". */
  type: string;
  /** Variable name / heading text / short snippet — whatever identifies this block to a user. */
  name: string;
  /** Nearest preceding header's text, or "Top of document". */
  location: string;
  /** The same one-line formatted representation used in the full-page context dump. */
  contextLine: string;
}

interface ChatContextType {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  selectedBlock: SelectedBlockInfo | null;
  toggleChat: () => void;
  sendMessage: (content: string, pagePath?: string) => Promise<void>;
  clearMessages: () => void;
  setPageContext: (context: string | null) => void;
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
  const pageContextRef = useRef<string | null>(null);
  const clearSelectionRef = useRef<(() => void) | null>(null);
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

  const toggleChat = useCallback(() => setIsOpen((v) => !v), []);
  const clearMessages = useCallback(() => setMessages([]), []);

  const sendMessage = useCallback(async (content: string, pagePath?: string) => {
    const userMessage: ChatMessage = { role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);

    // Append empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const selectedBlockContext = selectedBlock
      ? `[User has this block selected — ${selectedBlock.type} "${selectedBlock.name}" (in "${selectedBlock.location}"): ${selectedBlock.contextLine}]`
      : null;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, pagePath, pageContext: pageContextRef.current, selectedBlockContext }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
          }
          return updated;
        });
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
  }, [messages, selectedBlock]);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        messages,
        isLoading,
        selectedBlock,
        toggleChat,
        sendMessage,
        clearMessages,
        setPageContext,
        setSelectedBlock,
        clearSelectedBlock,
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
