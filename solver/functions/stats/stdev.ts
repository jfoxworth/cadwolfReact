import type { BuiltinFn } from "../../types";

export const stdev: BuiltinFn = async (args, _ctx) => {
  const v=Object.values(args[0]); const m=v.reduce((a,b)=>a+b,0)/v.length; return { '0-0': Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length) };
};
