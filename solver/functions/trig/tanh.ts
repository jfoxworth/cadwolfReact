import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const tanh: BuiltinFn = async (args) => elementwise(args[0], Math.tanh);
