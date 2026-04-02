"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import ItemIcon from "../ItemIcon";
import type { Item, ItemType } from "@/types/item";
import type { CadConn } from "../workspaceWrapper";

const LOCK_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const DOUBLE_CLICK_MS = 300;

const TYPE_ROUTE: Record<ItemType, string> = {
  WORKSPACE: "workspace",
  FOLDER: "workspace",
  DOCUMENT: "document",
  DATASET: "dataset",
  PART_TREE: "part-tree",
  IMAGE: "workspace",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export default function WorkspaceView({ items, cadConns }: { items: Item[]; cadConns: Map<string, CadConn> }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingItemRef = useRef<Item | null>(null);

  const handleClick = useCallback((item: Item) => {
    if (clickTimerRef.current !== null && pendingItemRef.current?.id === item.id) {
      // Second click on same item within threshold → double click → open
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      pendingItemRef.current = null;
      router.push(`/${TYPE_ROUTE[item.type]}/${item.slug}`);
    } else {
      // First click → select, start timer
      if (clickTimerRef.current !== null) clearTimeout(clickTimerRef.current);
      setSelectedId(item.id);
      pendingItemRef.current = item;
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        pendingItemRef.current = null;
      }, DOUBLE_CLICK_MS);
    }
  }, [router]);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white relative z-[1]">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_160px_160px] bg-white border-b border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
        <span>Name</span>
        <span>Date Created</span>
        <span>Last Modified</span>
      </div>

      {/* Rows */}
      {items.map((item, i) => {
        const cad = item.type === "DOCUMENT" ? cadConns.get(item.id) : undefined;
        const selected = selectedId === item.id;
        return (
          <div
            key={item.id}
            onClick={() => handleClick(item)}
            className={`grid grid-cols-[1fr_160px_160px] items-center px-4 py-3 cursor-pointer transition-colors select-none ${
              i < items.length - 1 ? "border-b border-gray-100" : ""
            } ${selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
          >
            <span className="flex items-center gap-3 text-base font-medium text-gray-800">
              {item.type === "IMAGE" && item.fileImage
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.fileImage} alt="" className="h-10 w-auto rounded object-contain opacity-90 shrink-0" />
                : <ItemIcon type={item.type} />
              }
              <span>{item.name}</span>
              {item.type === "DOCUMENT" && item.needsUpdate && (
                <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Import values out of date" />
              )}
              {item.lockedBy && item.lockedAt &&
                Date.now() - new Date(item.lockedAt).getTime() < LOCK_TIMEOUT_MS && (
                <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label="Checked out" />
              )}
              {cad?.href && (
                <a
                  href={cad.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open in Onshape"
                  className="ml-1 shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://cadwolf.s3.amazonaws.com/stock/onshapeIcon.png"
                    alt="Onshape"
                    className="h-5 w-5 rounded-full object-contain"
                  />
                </a>
              )}
            </span>
            <span className="text-base text-gray-400">{formatDate(item.createdAt)}</span>
            <span className="text-base text-gray-400">{formatDate(item.updatedAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
