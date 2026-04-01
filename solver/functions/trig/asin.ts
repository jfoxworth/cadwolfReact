import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

export const asin: BuiltinFn = async (args) => elementwise(args[0], Math.asin);
