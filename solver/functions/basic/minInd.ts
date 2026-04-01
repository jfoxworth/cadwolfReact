import type { BuiltinFn } from "../../types";

export const minInd: BuiltinFn = async (args, _ctx) => {
  const vals=Object.values(args[0]); const m=Math.min(...vals); return { '0-0': vals.indexOf(m) };
};
