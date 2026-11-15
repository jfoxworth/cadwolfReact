"use client";

import { useRef, useState } from "react";
import { DocumentBrowser } from "./DocumentBrowser";
import { isAiModelKey } from "@/utils/aiModels";
import { callCost, ratesFor, type CostParts, type TokenParts } from "@/utils/aiPricing";

interface Option { key: string; label: string }

// One model call in the run, with what the server did with its answer.
interface Call {
  label: string;
  system: string;
  user: string;
  thinking: string;
  text: string;
  tools: { name: string; input: unknown }[];
  done: ({ stop: string | null; seconds: number } & TokenParts) | null;
  replies: string[];
}

interface Result {
  /** The model the run used, so the cost is worked out at its prices. */
  model: string;
  calls: Call[];
  /** What the chat would show: the words streamed to it. */
  text: string;
  /** What would be added to the document, as the page receives it. */
  blocks: { name: string; input: unknown }[];
  usage: { input: number; output: number } | null;
  error: string | null;
}

const EMPTY: Result = { model: "", calls: [], text: "", blocks: [], usage: null, error: null };

const field = "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600";

function Panel({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded border border-gray-200 bg-white">
      <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-gray-900">{title}</summary>
      <div className="space-y-3 border-t border-gray-200 px-4 py-3">{children}</div>
    </details>
  );
}

const Pre = ({ children }: { children: string }) => (
  <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-gray-800">
    {children}
  </pre>
);

const Sub = ({ title }: { title: string }) => (
  <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{title}</p>
);

const PARTS: { key: keyof TokenParts; label: string }[] = [
  { key: "input", label: "Input, not cached" },
  { key: "cacheRead", label: "Input read from cache" },
  { key: "cacheWrite", label: "Input written to cache" },
  { key: "output", label: "Output (thinking counts as output)" },
];
const money = (n: number) => `$${n.toFixed(4)}`;

// Tokens and dollars for each part of a call, or of the whole run. `rates` is shown when given.
function CostTable({ tokens, cost, rates }: { tokens: TokenParts; cost: CostParts; rates?: TokenParts }) {
  const cell = "px-2 py-1 text-right";
  return (
    <table className="w-full text-xs text-gray-800">
      <thead>
        <tr className="border-b border-gray-200 text-gray-600">
          <th className="px-2 py-1 text-left font-semibold">Part</th>
          <th className={`${cell} font-semibold`}>Tokens</th>
          {rates && <th className={`${cell} font-semibold`}>$ per million</th>}
          <th className={`${cell} font-semibold`}>Cost</th>
        </tr>
      </thead>
      <tbody>
        {PARTS.map((p) => (
          <tr key={p.key} className="border-b border-gray-100">
            <td className="px-2 py-1">{p.label}</td>
            <td className={cell}>{tokens[p.key].toLocaleString()}</td>
            {rates && <td className={cell}>{rates[p.key]}</td>}
            <td className={cell}>{money(cost[p.key])}</td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td className="px-2 py-1">Total</td>
          <td className={cell}>{PARTS.reduce((n, p) => n + tokens[p.key], 0).toLocaleString()}</td>
          {rates && <td />}
          <td className={cell}>{money(cost.total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function lastCall(calls: Call[], change: (c: Call) => Call): Call[] {
  if (calls.length === 0) return calls;
  return [...calls.slice(0, -1), change(calls[calls.length - 1])];
}

export function Playground(props: {
  models: Option[];
  efforts: Option[];
  defaultModel: string;
  defaultEffort: string;
}) {
  const [document, setDocument] = useState<{ id: number; name: string } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [modelKey, setModelKey] = useState(props.defaultModel);
  const [effortKey, setEffortKey] = useState(props.defaultEffort);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setResult({ ...EMPTY, model: modelKey });
    try {
      // What the document page would hand the chat with this document open.
      const ctxResponse = await fetch(`/api/playground/context?documentId=${document?.id}`, { signal: controller.signal });
      if (!ctxResponse.ok) {
        const detail = await ctxResponse.json().catch(() => null);
        throw new Error(detail?.error ?? `Couldn't read the document (${ctxResponse.status})`);
      }
      const context = await ctxResponse.json();

      // The same request the chat sends for a Build, plus `trace` to also stream each call.
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          pagePath: `/document/${document?.id}`,
          pageContext: context.pageContext,
          pageImages: context.pageImages,
          pageEquations: context.pageEquations,
          mode: "build",
          modelKey,
          effortKey,
          trace: true,
        }),
      });
      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? `Request failed (${response.status})`);
      }
      const reader = response.body.getReader();
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
          let e: Record<string, unknown>;
          try { e = JSON.parse(line); } catch { continue; }
          setResult((r) => {
            switch (e.type) {
              case "step":
                return {
                  ...r,
                  calls: [...r.calls, {
                    label: e.label as string, system: e.system as string, user: e.user as string,
                    thinking: "", text: "", tools: [], done: null, replies: [],
                  }],
                };
              case "thinking":
                return { ...r, calls: lastCall(r.calls, (c) => ({ ...c, thinking: c.thinking + (e.text as string) })) };
              case "step_done":
                return {
                  ...r,
                  calls: lastCall(r.calls, (c) => ({
                    ...c,
                    text: e.text as string,
                    tools: e.tools as Call["tools"],
                    done: {
                      stop: e.stop as string | null, seconds: e.seconds as number,
                      input: e.input as number, output: e.output as number,
                      cacheRead: e.cacheRead as number, cacheWrite: e.cacheWrite as number,
                    },
                  })),
                };
              case "reply":
                return { ...r, calls: lastCall(r.calls, (c) => ({ ...c, replies: [...c.replies, e.text as string] })) };
              case "text": return { ...r, text: r.text + (e.text as string) };
              case "tool_use": return { ...r, blocks: [...r.blocks, { name: e.name as string, input: e.input }] };
              case "usage": return { ...r, usage: { input: e.input as number, output: e.output as number } };
              case "error": return { ...r, error: e.message as string };
              default: return r;
            }
          });
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setResult((r) => ({ ...r, error: err instanceof Error ? err.message : "Something went wrong." }));
      }
    } finally {
      setRunning(false);
    }
  }

  const canRun = !running && prompt.trim() !== "" && document !== null;

  // Each finished call costed at the run's model, then added up part by part.
  const priced = isAiModelKey(result.model)
    ? result.calls.flatMap((c) => {
        if (!c.done) return [];
        const model = result.model as Parameters<typeof callCost>[0];
        return [{ label: c.label, tokens: c.done, cost: callCost(model, c.done), rates: ratesFor(model, c.done) }];
      })
    : [];
  const runTokens: TokenParts = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
  const runCost: CostParts = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0 };
  for (const p of priced) {
    for (const k of ["input", "cacheRead", "cacheWrite", "output"] as const) {
      runTokens[k] += p.tokens[k];
      runCost[k] += p.cost[k];
    }
    runCost.total += p.cost.total;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Document build playground</h1>
      <p className="mt-2 text-sm text-gray-700">
        Runs a whole Document Build on a saved document: the solve step with the solver&apos;s replies and retries, then the write step.
        For every model call you see what was sent, the model&apos;s thinking, its tool calls and what the server answered.
        Nothing is added to the document or saved.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Document</label>
          <DocumentBrowser selectedId={document?.id ?? null} onSelect={setDocument} />
          <p className="mt-1 truncate text-xs text-gray-600">
            {document ? `Selected: ${document.name}` : "Open a workspace and folder, then click a document."}
          </p>
        </div>
        <div>
          <label className={label}>Model</label>
          <select className={field} value={modelKey} onChange={(e) => setModelKey(e.target.value)}>
            {props.models.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Effort</label>
          <select className={field} value={effortKey} onChange={(e) => setEffortKey(e.target.value)}>
            {props.efforts.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className={label}>Prompt</label>
        <textarea className={field} rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="What you would type in the chat." />
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={run} disabled={!canRun}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Run
        </button>
        {running && (
          <button onClick={() => abortRef.current?.abort()}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900">
            Stop
          </button>
        )}
        {running && <span className="self-center text-sm text-gray-600">Running…</span>}
      </div>

      {result.error && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">{result.error}</p>
      )}

      {(result.calls.length > 0 || running) && (
        <div className="mt-6 space-y-3">
          {result.calls.map((c, i) => {
            const waiting = running && i === result.calls.length - 1 && !c.done;
            const p = priced.find((x) => x.label === c.label);
            return (
              <Panel key={i} title={`${c.label}${c.done ? ` · ${c.done.seconds} s · stopped: ${c.done.stop ?? "unknown"}${p ? ` · ${money(p.cost.total)}` : ""}` : waiting ? " · running…" : ""}`}>
                <Sub title="Thinking" />
                {c.thinking ? <Pre>{c.thinking}</Pre>
                  : <p className="text-sm text-gray-600">{waiting ? "Waiting for the model…" : "No thinking summary."}</p>}
                {c.text && <><Sub title="Text" /><Pre>{c.text}</Pre></>}
                {c.tools.map((t, j) => (
                  <div key={j} className="space-y-1">
                    <Sub title={`Tool call: ${t.name}`} />
                    <Pre>{JSON.stringify(t.input, null, 2)}</Pre>
                  </div>
                ))}
                {c.replies.length > 0 && (
                  <><Sub title="What the server sent back" /><Pre>{c.replies.join("\n\n")}</Pre></>
                )}
                {p && <><Sub title="Cost of this call" /><CostTable tokens={p.tokens} cost={p.cost} rates={p.rates} /></>}
                <details className="rounded border border-gray-200">
                  <summary className="cursor-pointer px-3 py-1 text-xs font-semibold text-gray-700">Message sent in this call</summary>
                  <div className="border-t border-gray-200 px-3 py-2"><Pre>{c.user}</Pre></div>
                </details>
                <details className="rounded border border-gray-200">
                  <summary className="cursor-pointer px-3 py-1 text-xs font-semibold text-gray-700">System prompt sent in this call</summary>
                  <div className="border-t border-gray-200 px-3 py-2"><Pre>{c.system}</Pre></div>
                </details>
              </Panel>
            );
          })}
          {result.text && <Panel title="Words sent to the chat"><Pre>{result.text}</Pre></Panel>}
          {result.blocks.length > 0 && (
            <Panel title={`Blocks that would be added to the document (${result.blocks.length})`} open={false}>
              <Pre>{JSON.stringify(result.blocks.map((b) => ({ [b.name]: b.input })), null, 2)}</Pre>
            </Panel>
          )}
          {priced.length > 0 && (
            <Panel title={`Cost of the whole run: ${money(runCost.total)} (estimate)`}>
              <CostTable tokens={runTokens} cost={runCost} />
              <Sub title="By call" />
              <ul className="text-xs text-gray-800">
                {priced.map((x, i) => (
                  <li key={i} className="flex justify-between border-b border-gray-100 px-2 py-1">
                    <span>{x.label}</span><span>{money(x.cost.total)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-600">
                Worked out from the token counts the API reported and Anthropic&apos;s list prices for the model chosen (utils/aiPricing.ts).
                It is an estimate, not your bill.
              </p>
            </Panel>
          )}
          <p className="text-xs text-gray-500">Sent to /api/chat with mode &ldquo;build&rdquo; and trace on.</p>
        </div>
      )}
    </div>
  );
}
