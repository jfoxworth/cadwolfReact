import type { SolveContext, StepFn } from "../types";
import { encodeMatrix } from "./matrix-utils";

// Step 17: Replace_Tables
// Replaces dataset cell references in equations with their numeric values.
// Reference syntax: #DatasetName.COL.ROW  (column is a letter A=0, B=1, ...)
// Examples: #Dataset1.A.1  #File5Table2.B.3
//
// Requires ctx.datasets to be populated (passed in from the document page).
export const replaceTables: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (!ctx.datasets || ctx.datasets.size === 0) return ctx;

  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];
  const errors   = [...ctx.errors];

  // Pattern: #Word.LETTER.NUMBER  (case-insensitive column letter)
  const TABLE_RE = /^#([A-Za-z0-9_]+)\.([A-Za-z]+)\.(\d+)$/;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok.startsWith("#")) continue;

    const match = TABLE_RE.exec(tok);
    if (!match) continue;

    const [, datasetName, colStr, rowStr] = match;
    const colIndex = colStr.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, ...
    const rowIndex = parseInt(rowStr, 10) - 1;                 // 1-based → 0-based

    const dataset = ctx.datasets.get(datasetName);
    if (!dataset) {
      errors.push(`Dataset "${datasetName}" not found`);
      continue;
    }

    const row = dataset.data[rowIndex];
    if (!row) {
      errors.push(`Row ${rowIndex + 1} not found in dataset "${datasetName}"`);
      continue;
    }

    const cell = row[colIndex];
    if (cell === undefined) {
      errors.push(`Column ${colStr} not found in dataset "${datasetName}" row ${rowIndex + 1}`);
      continue;
    }

    // Encode the cell value as a MATRIX token (with units if present)
    const baseArray: number[] | undefined = undefined; // units resolved by step 16 if units string appended
    tokens[i]   = encodeMatrix({ "0-0": cell.real }, "1x1", cell.imag ? { "0-0": cell.imag } : {}, baseArray);
    keyArray[i] = 0;

    // If the cell has units, insert a unit token after it so step 16 can pick it up
    if (cell.units && cell.units.trim()) {
      tokens.splice(i + 1, 0, cell.units.trim());
      keyArray.splice(i + 1, 0, 1);
    }
  }

  return { ...ctx, tokens, keyArray, errors };
};
