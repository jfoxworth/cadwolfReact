import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

// isnan(x) — 1 where element is NaN, 0 otherwise
export const isnan: BuiltinFn = async (args) =>
  elementwise(args[0] ?? {}, (v) => (isNaN(v) ? 1 : 0));
