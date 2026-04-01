import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

// isinf(x) — 1 where element is ±Infinity, 0 otherwise
export const isinf: BuiltinFn = async (args) =>
  elementwise(args[0] ?? {}, (v) => (!isFinite(v) && !isNaN(v) ? 1 : 0));
