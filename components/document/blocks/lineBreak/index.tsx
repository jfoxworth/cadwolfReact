"use client";

import { X } from "lucide-react";

interface LineBreakBlockProps {
  isSelected?: boolean;
  canEdit?: boolean;
  onSelect?: (id: string | null) => void;
  onDelete?: () => void;
  blockId: string;
}

export default function LineBreakBlock({
  isSelected,
  canEdit,
  onSelect,
  onDelete,
  blockId,
}: LineBreakBlockProps) {
  return (
    <div
      className="relative group py-2 cursor-default"
      onClick={() => onSelect?.(blockId)}
    >
      <hr
        className={[
          "border-0 h-px w-full transition-colors",
          isSelected ? "bg-blue-200" : "bg-gray-150",
        ].join(" ")}
        style={{ backgroundColor: isSelected ? undefined : "#ebebeb" }}
      />

      {isSelected && canEdit && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-1 right-0 flex items-center justify-center w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500 shadow-sm"
          title="Delete line break"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}
