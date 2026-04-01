import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

// trunc(x) — round toward zero (MATLAB fix / Python math.trunc)
export const trunc: BuiltinFn = async (args) => elementwise(args[0] ?? {}, Math.trunc);
