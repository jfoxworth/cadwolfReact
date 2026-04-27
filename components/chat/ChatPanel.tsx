"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { MessageCircle, X, Send, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useChat } from "@/context/ChatContext";

export default function ChatPanel() {
  const { isOpen, messages, isLoading, toggleChat, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <>
      {/* Toggle button — fixed bottom-right */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        aria-label="Toggle chat"
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 h-[600px] bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
            <span className="text-sm font-medium">CadWolf Assistant</span>
            <button
              onClick={clearMessages}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Clear conversation"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.length === 0 && (
              <p className="text-sm text-gray-400 text-center mt-8">
                Ask anything about CadWolf or describe a structure you want to build.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white whitespace-pre-wrap"
                      : "bg-gray-100 text-gray-900 prose prose-sm max-w-none"
                  }`}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : msg.content === "" && isLoading ? (
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5" />
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-3 py-3 flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or describe a structure..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 max-h-32 overflow-y-auto"
              style={{ minHeight: "38px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
