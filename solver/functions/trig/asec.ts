import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const asec: BuiltinFn = async (args) => elementwise(args[0], (v) => Math.acos(1 / v));
