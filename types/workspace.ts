import type { Item } from "./item";

// Combined result of the two queries made when a workspace page loads:
//   1. Fetch the workspace entity by id (Item with type "WORKSPACE")
//   2. Fetch all items whose parentId matches the workspace id

export interface WorkspacePageData {
  workspace: Item;
  items: Item[];
}
