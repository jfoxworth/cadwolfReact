"use client";

import React, { useRef } from "react";
import {
  X,
  Eye,
  EyeOff,
  AlignLeft,
  Heading,
  FunctionSquare,
  Sigma,
  SlidersHorizontal,
  ChevronDown,
  ToggleLeft,
  Repeat,
  GitBranch,
  RefreshCw,
  LineChart,
  ImageIcon,
  Video,
  Minus,
} from "lucide-react";
import type { BlockType } from "@/types/document";

interface BlockEntry {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ElementType;
  // Tailwind color tokens — applied conditionally
  colorIcon: string;       // icon color when visible
  colorBorder: string;     // border when visible
  colorBg: string;         // background when visible
}

interface BlockGroup {
  label: string;
  color: string;           // group label color
  entries: BlockEntry[];
}

const GROUPS: BlockGroup[] = [
  {
    label: "Text & Headers",
    color: "text-blue-500",
    entries: [
      { type: "TEXT",   label: "Text",   description: "Rich-text paragraphs",  icon: AlignLeft, colorIcon: "text-blue-500", colorBorder: "border-blue-200", colorBg: "bg-blue-50" },
      { type: "HEADER", label: "Header", description: "Section headings",       icon: Heading,   colorIcon: "text-blue-500", colorBorder: "border-blue-200", colorBg: "bg-blue-50" },
    ],
  },
  {
    label: "Equations",
    color: "text-violet-500",
    entries: [
      { type: "EQUATION",          label: "Equation",          description: "Numeric equation solver",    icon: FunctionSquare, colorIcon: "text-violet-500", colorBorder: "border-violet-200", colorBg: "bg-violet-50" },
      { type: "SYMBOLIC_EQUATION", label: "Symbolic Equation", description: "LaTeX display equation",     icon: Sigma,          colorIcon: "text-violet-500", colorBorder: "border-violet-200", colorBg: "bg-violet-50" },
    ],
  },
  {
    label: "Inputs",
    color: "text-orange-500",
    entries: [
      { type: "SLIDER",       label: "Slider",       description: "Numeric range input",   icon: SlidersHorizontal, colorIcon: "text-orange-500", colorBorder: "border-orange-200", colorBg: "bg-orange-50" },
      { type: "DROPDOWN",     label: "Dropdown",     description: "Option selector",        icon: ChevronDown,       colorIcon: "text-orange-500", colorBorder: "border-orange-200", colorBg: "bg-orange-50" },
      { type: "SELECT_BLOCK", label: "Select Block", description: "Toggle between values",  icon: ToggleLeft,        colorIcon: "text-orange-500", colorBorder: "border-orange-200", colorBg: "bg-orange-50" },
    ],
  },
  {
    label: "Logic",
    color: "text-teal-500",
    entries: [
      { type: "FOR_LOOP",   label: "For Loop",   description: "Iterate over a range",         icon: Repeat,    colorIcon: "text-teal-500", colorBorder: "border-teal-200", colorBg: "bg-teal-50" },
      { type: "IF_ELSE",    label: "If / Else",  description: "Conditional branching",         icon: GitBranch, colorIcon: "text-teal-500", colorBorder: "border-teal-200", colorBg: "bg-teal-50" },
      { type: "WHILE_LOOP", label: "While Loop", description: "Loop until condition is false", icon: RefreshCw, colorIcon: "text-teal-500", colorBorder: "border-teal-200", colorBg: "bg-teal-50" },
    ],
  },
  {
    label: "Visualizations",
    color: "text-emerald-500",
    entries: [
      { type: "PLOT",  label: "Plot",  description: "Charts and graphs", icon: LineChart, colorIcon: "text-emerald-500", colorBorder: "border-emerald-200", colorBg: "bg-emerald-50" },
      { type: "IMAGE", label: "Image", description: "Embedded image",    icon: ImageIcon, colorIcon: "text-emerald-500", colorBorder: "border-emerald-200", colorBg: "bg-emerald-50" },
      { type: "VIDEO", label: "Video", description: "Embedded video",    icon: Video,     colorIcon: "text-emerald-500", colorBorder: "border-emerald-200", colorBg: "bg-emerald-50" },
    ],
  },
  {
    label: "Other",
    color: "text-gray-400",
    entries: [
      { type: "LINE_BREAK", label: "Line Break", description: "Horizontal divider", icon: Minus, colorIcon: "text-gray-400", colorBorder: "border-gray-200", colorBg: "bg-gray-50" },
    ],
  },
];

const ALL_TYPES = GROUPS.flatMap((g) => g.entries.map((e) => e.type));

interface DocumentHideShowModalProps {
  hiddenTypes: Set<BlockType>;
  onChange: (hidden: Set<BlockType>) => void;
  onClose: () => void;
}

export default function DocumentHideShowModal({
  hiddenTypes,
  onChange,
  onClose,
}: DocumentHideShowModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  const toggle = (type: BlockType) => {
    const next = new Set(hiddenTypes);
    if (next.has(type)) next.delete(type); else next.add(type);
    onChange(next);
  };

  const toggleGroup = (types: BlockType[]) => {
    const allHidden = types.every((t) => hiddenTypes.has(t));
    const next = new Set(hiddenTypes);
    if (allHidden) types.forEach((t) => next.delete(t));
    else           types.forEach((t) => next.add(t));
    onChange(next);
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Hide / Show Block Types</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 px-5 pt-3 pb-1">
          <button
            onClick={() => onChange(new Set())}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            Show all
          </button>
          <button
            onClick={() => onChange(new Set(ALL_TYPES))}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            Hide all
          </button>
        </div>

        {/* Groups */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-5">
          {GROUPS.map((group) => {
            const groupTypes = group.entries.map((e) => e.type);
            const allHidden = groupTypes.every((t) => hiddenTypes.has(t));

            return (
              <div key={group.label}>
                {/* Group label + toggle-all */}
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${group.color}`}>
                    {group.label}
                  </p>
                  <button
                    onClick={() => toggleGroup(groupTypes)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    {allHidden ? "Show all" : "Hide all"}
                  </button>
                </div>

                {/* Entry cards */}
                <div className="space-y-1.5">
                  {group.entries.map(({ type, label, description, icon: Icon, colorIcon, colorBorder, colorBg }) => {
                    const visible = !hiddenTypes.has(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggle(type)}
                        className={`w-full flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors ${
                          visible
                            ? `${colorBorder} ${colorBg}`
                            : "border-gray-200 bg-white opacity-50"
                        }`}
                      >
                        <Icon
                          size={16}
                          className={`shrink-0 ${visible ? colorIcon : "text-gray-300"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${visible ? "text-gray-800" : "text-gray-400 line-through"}`}>
                            {label}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                        </div>
                        {visible
                          ? <Eye size={14} className={`shrink-0 ${colorIcon} opacity-60`} />
                          : <EyeOff size={14} className="shrink-0 text-gray-300" />
                        }
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Hidden blocks are not deleted. Changes are not saved.
          </p>
        </div>
      </div>
    </div>
  );
}
