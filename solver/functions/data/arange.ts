import type { BuiltinFn, Matrix } from "../../types";

// arange(start, stop, step) — values from start up to (but not including) stop, incremented by step
// arange(stop) — equivalent to arange(0, stop, 1)
// arange(start, stop) — equivalent to arange(start, stop, 1)
// Mirrors numpy.arange behaviour. Returns a row vector.
export const arange: BuiltinFn = async (args, _ctx) => {
  let start: number, stop: number, step: number;

  if (args.length === 1) {
    start = 0;
    stop  = args[0]?.["0-0"] ?? 0;
    step  = 1;
  } else if (args.length === 2) {
    start = args[0]?.["0-0"] ?? 0;
    stop  = args[1]?.["0-0"] ?? 0;
    step  = 1;
  } else {
    start = args[0]?.["0-0"] ?? 0;
    stop  = args[1]?.["0-0"] ?? 0;
    step  = args[2]?.["0-0"] ?? 1;
  }

  if (step === 0) return { "0-0": NaN };

  const result: Matrix = {};
  let i = 0;
  let val = start;

  if (step > 0) {
    while (val < stop - step * 1e-10) {
      result[`0-${i++}`] = val;
      val = start + i * step;
    }
  } else {
    while (val > stop - step * 1e-10) {
      result[`0-${i++}`] = val;
      val = start + i * step;
    }
  }

  if (i === 0) return { "0-0": start };
  return result;
};
