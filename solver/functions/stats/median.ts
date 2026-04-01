import type { BuiltinFn } from "../../types";

export const median: BuiltinFn = async (args, _ctx) => {
  const v=[...Object.values(args[0])].sort((a,b)=>a-b); const m=Math.floor(v.length/2); return { '0-0': v.length%2?v[m]:(v[m-1]+v[m])/2 };
};
