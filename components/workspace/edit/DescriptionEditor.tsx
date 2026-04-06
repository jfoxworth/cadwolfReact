"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Link as LinkIcon, Unlink,
} from "lucide-react";

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

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export default function DescriptionEditor({ content, onChange }: Props) {
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content,
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const isLink = editor.isActive("link");

  function applyLink() {
    const url = linkInput.trim();
    if (url) editor?.chain().focus().setLink({ href: url }).run();
    setShowLinkInput(false);
    setLinkInput("");
  }

  return (
    <div className="border rounded-lg px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-500">
      {/* Toolbar */}
      <div className="border-b border-gray-200 pb-2 mb-2">
        <div className="flex items-center gap-0.5 flex-wrap">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
            <Bold size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
            <Italic size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
            <UnderlineIcon size={13} />
          </ToolbarButton>

          <span className="w-px h-4 bg-gray-200 mx-1" />

          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
            <List size={13} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
            <ListOrdered size={13} />
          </ToolbarButton>

          <span className="w-px h-4 bg-gray-200 mx-1" />

          <ToolbarButton
            onClick={() => {
              setLinkInput(editor.getAttributes("link").href as string ?? "");
              setShowLinkInput((v) => !v);
            }}
            active={isLink}
            title="Add link"
          >
            <LinkIcon size={13} />
          </ToolbarButton>
          {isLink && (
            <ToolbarButton onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkInput(false); }} title="Remove link">
              <Unlink size={13} />
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

      {/* Editor content */}
      <EditorContent editor={editor} className="prose prose-sm max-w-none min-h-[80px]" />
    </div>
  );
}
