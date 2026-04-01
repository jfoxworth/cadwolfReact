import { Pencil, AlignLeft } from "lucide-react";

interface DatasetActionPanelProps {
  onEditTitle: () => void;
  onEditDescription: () => void;
}

export default function DatasetActionPanel({
  onEditTitle,
  onEditDescription,
}: DatasetActionPanelProps) {
  return (
    <div className="w-56 shrink-0 flex flex-col gap-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Dataset
        </p>
        <nav className="flex flex-col gap-0.5">
          <button
            onClick={onEditTitle}
            className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors text-left"
          >
            <Pencil size={15} className="shrink-0 text-gray-400" />
            Edit Title
          </button>
          <button
            onClick={onEditDescription}
            className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors text-left"
          >
            <AlignLeft size={15} className="shrink-0 text-gray-400" />
            Edit Description
          </button>
        </nav>
      </div>
    </div>
  );
}
