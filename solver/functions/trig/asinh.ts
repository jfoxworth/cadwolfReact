import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const asinh: BuiltinFn = async (args) => elementwise(args[0], Math.asinh);
