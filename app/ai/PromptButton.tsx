"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export interface PromptView {
  /** The agent that makes this call, shown at the top of the modal. */
  agent: string;
  /** Which call it is. */
  call: string;
  tool: string;
  /** What else is sent with the prompt, in one sentence. */
  alsoSent: string;
  prompt: string;
  /** Text appended to the prompt that is long enough to keep folded. */
  appendixTitle?: string;
  appendix?: string;
}

/** A button that opens a modal showing the prompt for one call. */
export function PromptButton({ view }: { view: PromptView }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
      >
        View prompt
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${view.agent}: ${view.call}`}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3">
              <div>
                <div className="text-base font-semibold text-slate-900">Agent: {view.agent}</div>
                <div className="text-sm text-slate-600">{view.call}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <p className="text-xs text-slate-600">
                <b>Tool:</b> {view.tool}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                <b>Also sent with it:</b> {view.alsoSent}
              </p>
              <pre className="mt-4 whitespace-pre-wrap break-words rounded border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800">
                {view.prompt}
              </pre>
              {view.appendix && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-700">
                    {view.appendixTitle ?? "More"} (added to the end of the prompt)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800">
                    {view.appendix}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
