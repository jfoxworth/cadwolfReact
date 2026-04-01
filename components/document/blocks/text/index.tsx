"use client";

import { memo, useState } from "react";
import { EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import {
  Check, Link as LinkIcon, Unlink,
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered,
} from "lucide-react";
import type { Block } from "@/types/document";
import type { SelectBlockFn, StartEditingFn, SaveFn } from "../../documentWrapper";

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function ToolbarButton({
  onClick, active, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-blue-100 text-blue-700"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const isLink = editor.isActive("link");

  function openLinkInput() {
    setLinkInput(editor.getAttributes("link").href as string ?? "");
    setShowLinkInput(true);
  }

  function applyLink() {
    const url = linkInput.trim();
    if (url) editor.chain().focus().setLink({ href: url }).run();
    setShowLinkInput(false);
    setLinkInput("");
  }

  function removeLink() {
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
  }

  return (
    <div className="border-b border-gray-200 pb-2 mb-2">
      <div className="flex items-center gap-0.5 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon size={14} />
        </ToolbarButton>

        <span className="w-px h-4 bg-gray-200 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
          <AlignLeft size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
          <AlignCenter size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
          <AlignRight size={14} />
        </ToolbarButton>

        <span className="w-px h-4 bg-gray-200 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
          <ListOrdered size={14} />
        </ToolbarButton>

        <span className="w-px h-4 bg-gray-200 mx-1" />

        <ToolbarButton onClick={openLinkInput} active={isLink} title="Add link">
          <LinkIcon size={14} />
        </ToolbarButton>
        {isLink && (
          <ToolbarButton onClick={removeLink} title="Remove link">
            <Unlink size={14} />
          </ToolbarButton>
        )}
      </div>

      {showLinkInput && (
        <div className="flex items-center gap-2 mt-2">
          <input
            autoFocus
            type="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setShowLinkInput(false); }}
            placeholder="https://..."
            className="flex-1 text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:border-blue-400"
          />
          <button type="button" onMouseDown={(e) => { e.preventDefault(); applyLink(); }} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            Apply
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(false); }} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Text Block ───────────────────────────────────────────────────────────────

export interface TextBlockProps {
  block: Block;
  edit?: boolean;
  isSelected?: boolean;
  isEditing?: boolean;
  /** Shared editor instance — only passed when this block is the active one */
  editor?: Editor | null;
  onSelect?: SelectBlockFn;
  onStartEditing?: StartEditingFn;
  onSave?: SaveFn;
  /** Local HTML override after an unsaved edit */
  displayHtml?: string;
}

export default memo(function TextBlock({
  block,
  edit = false,
  isSelected = false,
  isEditing = false,
  editor = null,
  onSelect,
  onStartEditing,
  onSave,
  displayHtml,
}: TextBlockProps) {
  const html = displayHtml ?? (block.definition.text as string);

  // ── Editing mode: shared editor mounted here ────────────────────────────────
  if (isEditing && editor) {
    return (
      <div className="ring-2 ring-blue-400 bg-white p-3 rounded-md">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
        <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <Check size={12} />
            Save
          </button>
        </div>
      </div>
    );
  }

  // ── View-only: plain HTML, no interaction ───────────────────────────────────
  if (!edit) {
    return (
      <div
        className="prose prose-gray max-w-none font-[family-name:var(--font-source-serif)]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // ── Edit-permitted but not active: click to select, double-click to edit ───
  return (
    <div
      onClick={() => onSelect?.(isSelected ? null : block.id)}
      onDoubleClick={() => onStartEditing?.(block.id, html)}
      className={`rounded-md transition-all p-3 ${
        isSelected
          ? "ring-2 ring-blue-200 bg-blue-50/30 cursor-pointer"
          : "cursor-pointer hover:bg-gray-50"
      }`}
    >
      <div
        className="prose prose-gray max-w-none font-[family-name:var(--font-source-serif)]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
});
