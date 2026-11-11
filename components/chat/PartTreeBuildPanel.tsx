"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/context/ChatContext";
import type { BuildEvent } from "@/agents/types";

// Part Tree Build mode: starts the agentic build (app/api/part-tree/build, see
// PART_TREE_BUILD_PROCESS.md) and shows its progress. Uses the model and effort chosen in the
// chat panel's picker. With "Design documents only" checked (the default) the build writes the
// design documents and creates the structure, then stops before the parts are built, so the
// design can be checked before the full build is paid for.
export default function PartTreeBuildPanel() {
  const { currentFileId, modelKey, effortKey } = useChat();
  const [prompt, setPrompt] = useState("Read the requirements documents and build the system.");
  const [designOnly, setDesignOnly] = useState(true);
  const [running, setRunning] = useState(false);
  const [wroteChanges, setWroteChanges] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [designDocuments, setDesignDocuments] = useState<{ slug: string; name: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  function describe(event: BuildEvent): string | null {
    switch (event.type) {
      case "start": return "Build started.";
      case "agent_start": return `${event.agent} started.`;
      case "agent_done": return `${event.agent} finished.`;
      case "notice": return event.message;
      case "design_document": return `${event.name} ${event.replaced ? "replaced" : "created"}.`;
      case "item": return `${event.created ? "Created" : "Kept existing"} ${event.kind}: ${event.name}`;
      case "error": return `Error: ${event.message}`;
      case "done": return "Done.";
    }
  }

  async function handleStart() {
    if (currentFileId === null) return;
    setRunning(true);
    setWroteChanges(false);
    setLog([]);
    setDesignDocuments([]);
    const controller = new AbortController();
    abortRef.current = controller;

    const handle = (event: BuildEvent) => {
      const line = describe(event);
      if (line) setLog((prev) => [...prev, line]);
      if (event.type === "design_document") setDesignDocuments((prev) => [...prev, { slug: event.slug, name: event.name }]);
      if (event.type === "design_document" || (event.type === "item" && event.created)) setWroteChanges(true);
    };

    try {
      const res = await fetch("/api/part-tree/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partTreeId: currentFileId, prompt, modelKey, effortKey, designOnly }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setLog((prev) => [...prev, `Error: the build could not start (${res.status}).`]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try { handle(JSON.parse(line) as BuildEvent); } catch { /* ignore a malformed line */ }
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setLog((prev) => [...prev, `Error: ${err instanceof Error ? err.message : String(err)}`]);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="border-t border-gray-200 px-4 py-3 flex flex-col gap-2 overflow-y-auto min-h-0">
      <div className="text-sm font-semibold text-gray-900">Build this part tree</div>
      <p className="text-xs text-gray-500">
        Reads the requirements documents, writes a design document for the part tree and for every
        system and part beneath it, each next to the item it designs, and creates those systems and
        parts. Unchecking the box below also writes the document of every part. Uses the model and
        effort chosen below.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        disabled={running}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={designOnly} onChange={(e) => setDesignOnly(e.target.checked)} disabled={running} />
        Design documents only (don&apos;t build the parts)
      </label>

      <div className="flex justify-end gap-2">
        {!running && wroteChanges && (
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
          >
            Reload page
          </button>
        )}
        {running && (
          <button
            onClick={() => abortRef.current?.abort()}
            className="px-3 py-1.5 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition"
          >
            Stop
          </button>
        )}
        <button
          onClick={handleStart}
          disabled={running || !prompt.trim() || currentFileId === null}
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {running ? "Running…" : designOnly ? "Build design documents" : "Build everything"}
        </button>
      </div>

      {log.length > 0 && (
        <pre className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
          {log.join("\n")}
        </pre>
      )}

      {designDocuments.map(({ slug, name }) => (
        <a
          key={slug}
          href={`/document/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          {name}
        </a>
      ))}
    </div>
  );
}
