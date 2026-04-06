import { Folder, FileText, Database, GitBranch, Image } from "lucide-react";
import type { ItemType } from "@/types/item";

const iconMap: Record<ItemType, React.ReactNode> = {
  WORKSPACE: <Folder size={18} className="text-blue-500" />,
  FOLDER:    <Folder size={18} className="text-yellow-500" />,
  DOCUMENT:  <FileText size={18} className="text-gray-500" />,
  DATASET:   <Database size={18} className="text-green-500" />,
  PART_TREE: <GitBranch size={18} className="text-purple-500" />,
  IMAGE:     <Image size={18} className="text-pink-500" />,
};

export default function ItemIcon({ type }: { type: ItemType }) {
  return <>{iconMap[type]}</>;
}
