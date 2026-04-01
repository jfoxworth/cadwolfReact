import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const exp: BuiltinFn = async (args) => elementwise(args[0] ?? {}, Math.exp);
