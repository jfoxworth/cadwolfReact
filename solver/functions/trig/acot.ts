import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const acot: BuiltinFn = async (args) => elementwise(args[0], (v) => Math.atan(1 / v));
