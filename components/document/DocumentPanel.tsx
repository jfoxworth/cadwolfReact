"use client";

import React from "react";
import {
  AlignLeft,
  Heading,
  FunctionSquare,
  Sigma,
  SlidersHorizontal,
  ToggleLeft,
  ChevronDown,
  Repeat,
  GitBranch,
  RefreshCw,
  LineChart,
  Image,
  Video,
  Minus,
  Settings,
  Eye,
  List,
  Link,
  BookMarked,
  Code,
  LogIn,
  Database,
  Package,
  Network,
} from "lucide-react";

import type { BlockType } from "@/types/document";

const addBlocks: { label: string; icon: React.ElementType; type: BlockType }[] = [
  { label: "Text",              icon: AlignLeft,        type: "TEXT" },
  { label: "Header",            icon: Heading,          type: "HEADER" },
  { label: "Equation",          icon: FunctionSquare,   type: "EQUATION" },
  { label: "Symbolic Equation", icon: Sigma,            type: "SYMBOLIC_EQUATION" },
  { label: "Slider",            icon: SlidersHorizontal,type: "SLIDER" },
  { label: "Select Block",      icon: ToggleLeft,       type: "SELECT_BLOCK" },
  { label: "Dropdown",          icon: ChevronDown,      type: "DROPDOWN" },
  { label: "For Loop",          icon: Repeat,           type: "FOR_LOOP" },
  { label: "If / Else",         icon: GitBranch,        type: "IF_ELSE" },
  { label: "While Loop",        icon: RefreshCw,        type: "WHILE_LOOP" },
  { label: "Plot",              icon: LineChart,        type: "PLOT" },
  { label: "Image",             icon: Image,            type: "IMAGE" },
  { label: "Video",             icon: Video,            type: "VIDEO" },
  { label: "Line Break",        icon: Minus,            type: "LINE_BREAK" },
];

const docProperties = [
  { label: "Properties",          icon: Settings },
  { label: "Hide / Show Items",   icon: Eye },
  { label: "Table of Contents",   icon: List },
  { label: "Link to CAD",         icon: Link },
  { label: "Bibliography",        icon: BookMarked },
  { label: "File as a Function",  icon: Code },
  { label: "File Inputs",         icon: LogIn },
  { label: "Dataset Inputs",      icon: Database },
  { label: "Imported Functions",  icon: Package },
  { label: "Dependent Files",     icon: Network },
];

interface DocumentPanelProps {
  canEdit: boolean;
  onAddBlock: (type: BlockType) => void;
  onPropertiesClick: () => void;
  onHideShowClick: () => void;
  onTocClick: () => void;
  onFunctionClick: () => void;
  onBibliographyClick: () => void;
  onFileInputsClick: () => void;
  onDatasetInputsClick: () => void;
  onDependentFilesClick: () => void;
  onImportedFunctionsClick: () => void;
  onLinkCadClick: () => void;
  onPersist: () => void;
  saving: boolean;
}

function IconGrid({
  title,
  items,
}: {
  title: string;
  items: { label: string; icon: React.ElementType; onClick?: () => void }[];
}) {
  const [hovered, setHovered] = React.useState<string | null>(null);

  return (
    <div className="w-52 rounded-lg border border-gray-200 bg-white p-2">
      <p className="h-4 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1 truncate overflow-hidden">
        {hovered ?? title}
      </p>
      <div className="grid grid-cols-3 gap-1">
        {items.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            onMouseEnter={() => setHovered(label)}
            onMouseLeave={() => setHovered(null)}
            aria-label={label}
            className="flex items-center justify-center py-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DocumentPanel({ canEdit, onAddBlock, onPropertiesClick, onHideShowClick, onTocClick, onFunctionClick, onBibliographyClick, onFileInputsClick, onDatasetInputsClick, onDependentFilesClick, onImportedFunctionsClick, onLinkCadClick, onPersist, saving }: DocumentPanelProps) {
  const docPropertyHandlers: Record<string, (() => void) | undefined> = {
    "Properties":         onPropertiesClick,
    "Hide / Show Items":  onHideShowClick,
    "Table of Contents":  onTocClick,
    "File as a Function": onFunctionClick,
    "Bibliography":       onBibliographyClick,
    "File Inputs":        onFileInputsClick,
    "Dataset Inputs":     onDatasetInputsClick,
    "Dependent Files":    onDependentFilesClick,
    "Imported Functions": onImportedFunctionsClick,
    "Link to CAD":        onLinkCadClick,
  };

  return (
    <div className="shrink-0 flex flex-col gap-4">

      {/* Add Block — only when user can edit */}
      {canEdit && (
        <IconGrid
          title="Add Block"
          items={addBlocks.map(({ label, icon, type }) => ({
            label,
            icon,
            onClick: () => onAddBlock(type),
          }))}
        />
      )}

      {/* Document Properties — always visible */}
      <IconGrid
        title="Document"
        items={docProperties.map(({ label, icon }) => ({
          label,
          icon,
          onClick: docPropertyHandlers[label],
        }))}
      />

      {/* Save — only when user can edit */}
      {canEdit && (
        <button
          onClick={onPersist}
          disabled={saving}
          className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}

    </div>
  );
}
