import type { Item } from "./item";

export interface PartTreePageData {
  partTree: Item;
  items: Item[]; // all descendants, flat array
}
