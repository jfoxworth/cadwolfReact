import type { BuiltinFn } from "../../types";

export const range: BuiltinFn = async (args, _ctx) => {
  const v=Object.values(args[0]); return { '0-0': Math.max(...v)-Math.min(...v) };
};
