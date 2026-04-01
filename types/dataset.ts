export interface DatasetParser {
  id: string;
  label: string;      // e.g. "Row", "Column"
  separator: string;  // user-visible escape string, e.g. "\n", ","
}

export interface Dataset {
  id: string;
  type: "DATASET";
  name: string;
  description?: string;
  parentId: string | null;
  ownerId?: string;
  parsers: DatasetParser[];
  rawText: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetPageData {
  dataset: Dataset;
}
