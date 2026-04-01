import type { BuiltinFn } from "../../types";

export const sum: BuiltinFn = async (args, _ctx) => {
  const v=Object.values(args[0]); return { '0-0': v.reduce((a,b)=>a+b,0) };
};
