import type { BuiltinFn } from "../../types";

// fourier(data)
// Discrete Fourier Transform (DFT) of a real-valued row vector.
// Uses the O(N²) definition — for large inputs use fft() instead.
//
//   args[0] = data — 1×N row vector of real signal values
//
// Returns a complex 1×N encoded matrix (real + imaginary parts).
// Step 07 handles this function specially to encode both real and imag components.
// This stub returns just the real part as a fallback.
export const fourier: BuiltinFn = async (args, _ctx) => {
  const data = args[0] ?? {};
  const N = Object.keys(data).length;
  if (N === 0) return { "0-0": 0 };

  const vals: number[] = [];
  for (let i = 0; i < N; i++) vals.push(data[`0-${i}`] ?? data[`${i}-0`] ?? 0);

  const realOut: Record<string, number> = {};
  for (let k = 0; k < N; k++) {
    let re = 0;
    for (let b = 0; b < N; b++) re += vals[b] * Math.cos(-2 * Math.PI * k * b / N);
    realOut[`0-${k}`] = re;
  }
  return realOut;
};
