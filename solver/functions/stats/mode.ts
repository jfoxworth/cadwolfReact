import type { BuiltinFn } from "../../types";

export const mode: BuiltinFn = async (args, _ctx) => {
  const v=Object.values(args[0]); const freq: Record<number,number>={}; v.forEach(x=>{freq[x]=(freq[x]||0)+1;}); return { '0-0': +Object.keys(freq).reduce((a,b)=>freq[+a]>freq[+b]?a:b) };
};
