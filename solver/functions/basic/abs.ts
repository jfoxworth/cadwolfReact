import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const abs: BuiltinFn = async (args) => elementwise(args[0], Math.abs);
