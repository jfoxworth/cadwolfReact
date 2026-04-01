import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const atan: BuiltinFn = async (args) => elementwise(args[0], Math.atan);
