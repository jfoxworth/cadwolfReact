import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const sqrt: BuiltinFn = async (args) => elementwise(args[0] ?? {}, Math.sqrt);
