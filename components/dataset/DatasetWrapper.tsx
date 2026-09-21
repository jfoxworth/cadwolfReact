"use client";

import { useEffect } from "react";
import DatasetView from "./DatasetView";
import DatasetEdit from "./DatasetEdit";
import type { DatasetPageData, DatasetParser } from "@/types/dataset";
import { parseDataset, computeSizeString, sliceTo2D, displaySeparator, type NestedStringArray } from "@/utils/parseDataset";
import { useChat } from "@/context/ChatContext";

interface DatasetWrapperProps {
  data: DatasetPageData;
  canEdit: boolean;
}

// Matches DatasetView.tsx's own preview cap — the chat should never claim to know
// more of a dataset than what's actually shown on screen.
const PREVIEW_ROWS = 6;

// Shared by DatasetWrapper (view mode, static dataset prop) and DatasetEdit (edit mode,
// its own live rawText/parsers state) — the edit-mode caller re-derives this whenever the
// user or a chat proposal changes parsers, so the model always sees the current config
// rather than what the dataset originally loaded with.
export function buildDatasetContext(input: { name: string; description?: string; rawText: string; parsers: DatasetParser[] }): string {
  const { name, description, rawText, parsers } = input;
  const parsed: NestedStringArray = parsers.length > 0 ? parseDataset(rawText, parsers) : rawText;
  const sizeString = parsers.length > 0 ? computeSizeString(parsed, parsers.length) : "—";
  const rows = sliceTo2D(parsed, parsers.length, []);
  const preview = rows.slice(0, PREVIEW_ROWS);
  const overflow = rows.length - PREVIEW_ROWS;

  const parserLine = parsers.length
    ? `Parsers (innermost → outermost): ${parsers.map((p) => `${p.label} ("${displaySeparator(p.separator)}")`).join(", ")}`
    : "No parsers configured yet.";

  return [
    `Dataset "${name}"${description ? `: ${description}` : ""} (size ${sizeString})`,
    parserLine,
    rawText.trim()
      ? preview.map((row) => row.join(", ")).join("\n") + (overflow > 0 ? `\n…and ${overflow} more row${overflow === 1 ? "" : "s"}` : "")
      : "(no data yet)",
  ].join("\n");
}

export default function DatasetWrapper({ data, canEdit }: DatasetWrapperProps) {
  const { dataset } = data;
  const { setPageContext } = useChat();

  // Only relevant in view mode — in edit mode, DatasetEdit owns context itself since it
  // holds the live rawText/parsers state (this dataset prop is otherwise a static snapshot).
  useEffect(() => {
    if (canEdit) return;
    setPageContext(buildDatasetContext(dataset));
    return () => setPageContext(null);
  }, [dataset, canEdit, setPageContext]);

  return (
    <div className="flex-1 px-8 py-10 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{dataset.name}</h1>
        {dataset.description && (
          <p className="mt-1 text-gray-500">{dataset.description}</p>
        )}
      </div>

      {canEdit ? (
        <DatasetEdit dataset={dataset} />
      ) : (
        <DatasetView dataset={dataset} />
      )}
    </div>
  );
}
