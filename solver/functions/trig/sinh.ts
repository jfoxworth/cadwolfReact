import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const sinh: BuiltinFn = async (args) => elementwise(args[0], Math.sinh);
