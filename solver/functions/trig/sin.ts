import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const sin: BuiltinFn = async (args) => elementwise(args[0], Math.sin);
