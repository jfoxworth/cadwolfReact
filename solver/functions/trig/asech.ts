import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const asech: BuiltinFn = async (args) =>
  elementwise(args[0], (v) => Math.log((1 + Math.sqrt(1 - v * v)) / v));
