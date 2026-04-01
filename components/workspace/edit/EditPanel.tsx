import {
  FolderPlus,
  FilePlus,
  Database,
  GitBranch,
  ImagePlus,
  Pencil,
  AlignLeft,
  Lock,
  ArrowRightLeft,
  Copy,
  Trash2,
} from "lucide-react";
import type { Item } from "@/types/item";

const addItems = [
  { label: "Add Workspace",  icon: FolderPlus },
  { label: "Add Document",   icon: FilePlus },
  { label: "Add Dataset",    icon: Database },
  { label: "Add Part Tree",  icon: GitBranch },
  { label: "Add Image",      icon: ImagePlus },
];

const editItems = [
  { label: "Edit Title",       icon: Pencil },
  { label: "Edit Description", icon: AlignLeft },
  { label: "Edit Permissions", icon: Lock },
  { label: "Move Item",        icon: ArrowRightLeft },
  { label: "Copy Item",        icon: Copy },
  { label: "Delete Item",      icon: Trash2, destructive: true },
];

interface EditPanelProps {
  selectedItem: Item | null;
  canAdmin: boolean;
  onEditTitle: () => void;
  onEditDescription: () => void;
  onDeleteItem: () => void;
  onEditPermissions: () => void;
}

export default function EditPanel({ selectedItem, canAdmin, onEditTitle, onEditDescription, onDeleteItem, onEditPermissions }: EditPanelProps) {
  return (
    <div className="w-56 shrink-0 flex flex-col gap-4">

      {/* Add Item */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Add Item
        </p>
        <nav className="flex flex-col gap-0.5">
          {addItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors text-left"
              // TODO: wire up add actions
            >
              <Icon size={15} className="shrink-0 text-gray-400" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Edit Selected Item */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Edit Item
        </p>
        {selectedItem ? (
          <p className="text-xs text-gray-500 mb-2 truncate" title={selectedItem.name}>
            {selectedItem.name}
          </p>
        ) : (
          <p className="text-xs text-gray-400 italic mb-2">No item selected</p>
        )}
        <nav className="flex flex-col gap-0.5">
          {editItems.map(({ label, icon: Icon, destructive }) => {
            const onClick =
              label === "Edit Title" ? onEditTitle :
              label === "Edit Description" ? onEditDescription :
              label === "Delete Item" ? onDeleteItem :
              label === "Edit Permissions" ? onEditPermissions :
              undefined;
            const isDisabled = !selectedItem || (label === "Edit Permissions" && !canAdmin);
            return (
              <button
                key={label}
                disabled={isDisabled}
                onClick={onClick}
                className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors text-left disabled:opacity-30 disabled:cursor-not-allowed ${
                  destructive
                    ? "text-red-500 hover:bg-red-50 hover:text-red-600"
                    : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
