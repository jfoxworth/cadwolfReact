import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const acsc: BuiltinFn = async (args) => elementwise(args[0], (v) => Math.asin(1 / v));
