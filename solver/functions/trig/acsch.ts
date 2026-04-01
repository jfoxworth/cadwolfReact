import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const acsch: BuiltinFn = async (args) =>
  elementwise(args[0], (v) => Math.log(1 / v + Math.sqrt(1 / (v * v) + 1)));
