"use client";

import React, { useRef } from "react";
import { List } from "lucide-react";
import type { VirtualBlock } from "@/types/document";
import type { TocSettings } from "@/types/item";

interface TocEntry {
  blockId: string;
  text: string;
  level: number;
}

interface DocumentTableOfContentsProps {
  blocks: VirtualBlock[];
  toc: TocSettings;
  // Ref to the scrollable content container so we can scroll inside it
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export default function DocumentTableOfContents({
  blocks,
  toc,
  scrollContainerRef,
}: DocumentTableOfContentsProps) {
  if (!toc.show) return null;

  const entries: TocEntry[] = blocks
    .filter(
      (b) =>
        b._status !== "deleted" &&
        b.type === "HEADER" &&
        typeof b.definition.level === "number" &&
        (b.definition.level as number) <= toc.maxLevel &&
        (b.definition.text as string)?.trim(),
    )
    .sort((a, b) => a.order - b.order)
    .map((b) => ({
      blockId: b.id,
      text:    b.definition.text as string,
      level:   b.definition.level as number,
    }));

  if (entries.length === 0) return null;

  const scrollTo = (blockId: string) => {
    const container = scrollContainerRef.current;
    const target    = document.getElementById(blockId);
    if (!target) return;

    if (container) {
      // Scroll within the container so the fixed-height column stays put
      const containerTop = container.getBoundingClientRect().top;
      const targetTop    = target.getBoundingClientRect().top;
      container.scrollBy({ top: targetTop - containerTop - 24, behavior: "smooth" });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="mb-8 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <List size={14} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Table of Contents
        </span>
      </div>

      <ol className="space-y-0.5">
        {entries.map((entry, i) => {
          // Indent deeper levels
          const indent = (entry.level - 1) * 14;
          const isTop  = entry.level === 1;

          return (
            <li key={entry.blockId} style={{ paddingLeft: indent }}>
              <button
                onClick={() => scrollTo(entry.blockId)}
                className={`group flex items-baseline gap-2 w-full text-left py-0.5 transition-colors hover:text-blue-600 ${
                  isTop ? "text-gray-800 font-medium" : "text-gray-600"
                }`}
              >
                <span className="text-xs text-gray-300 tabular-nums w-5 shrink-0 text-right group-hover:text-blue-300">
                  {i + 1}.
                </span>
                <span className={`leading-snug ${isTop ? "text-sm" : "text-sm"}`}>
                  {entry.text}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
