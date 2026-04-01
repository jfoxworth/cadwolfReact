import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const acoth: BuiltinFn = async (args) =>
  elementwise(args[0], (v) => 0.5 * Math.log((v + 1) / (v - 1)));
