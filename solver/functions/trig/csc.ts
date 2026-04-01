import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const csc: BuiltinFn = async (args) => elementwise(args[0], (v) => 1 / Math.sin(v));
