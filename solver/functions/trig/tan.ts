import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const tan: BuiltinFn = async (args) => elementwise(args[0], Math.tan);
