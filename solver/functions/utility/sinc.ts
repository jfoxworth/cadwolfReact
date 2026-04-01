import type { BuiltinFn } from "../../types";
import { elementwise } from "../elementwise";

// sinc(x) — normalized sinc: sin(πx)/(πx), with sinc(0) = 1
export const sinc: BuiltinFn = async (args) =>
  elementwise(args[0] ?? {}, (x) => {
    if (x === 0) return 1;
    const px = Math.PI * x;
    return Math.sin(px) / px;
  });
