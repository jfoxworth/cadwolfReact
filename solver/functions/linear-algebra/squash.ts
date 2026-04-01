import type { BuiltinFn } from "../../types";

// TODO: implement squash from eqSolverOld.js
export const squash: BuiltinFn = async (_args, _ctx) => {
  return { "0-0": 0 };
};
