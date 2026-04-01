import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const sign: BuiltinFn = async (args) => elementwise(args[0], Math.sign);
