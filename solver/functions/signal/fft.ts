import type { BuiltinFn, Matrix } from "../../types";

// fft(data, sampleRate)
// Fast Fourier Transform of a real-valued signal using the Cooley-Tukey radix-2 algorithm.
// Zero-pads input to the next power of 2 if needed.
//
//   args[0] = data       — 1×N row vector of real signal values
//   args[1] = sampleRate — scalar sample rate in Hz
//
// Returns a 1×(N/2) row vector of magnitude spectrum values (scaled by 2/N).
// Matches the old code's output: fft.spectrum = (2/bufferSize) * |X[k]| for k=0..N/2-1.
export const fft: BuiltinFn = async (args, _ctx) => {
  const data = args[0] ?? {};
  const sampleRate = args[1]?.["0-0"] ?? 1;

  const N = Object.keys(data).length;
  if (N === 0) return { "0-0": 0 };

  // Extract row-vector values
  const vals: number[] = [];
  for (let i = 0; i < N; i++) {
    vals.push(data[`0-${i}`] ?? data[`${i}-0`] ?? 0);
  }

  // Zero-pad to next power of 2
  const bufferSize = Math.pow(2, Math.ceil(Math.log2(Math.max(vals.length, 1))));
  while (vals.length < bufferSize) vals.push(0);

  // Bit-reversal permutation table
  const reverseTable = new Uint32Array(bufferSize);
  let limit = 1, bit = bufferSize >> 1;
  while (limit < bufferSize) {
    for (let i = 0; i < limit; i++) reverseTable[i + limit] = reverseTable[i] + bit;
    limit <<= 1;
    bit >>= 1;
  }

  // Precomputed twiddle factors (matching old code: sin/cos(-π/i))
  const sinTable = new Float64Array(bufferSize);
  const cosTable = new Float64Array(bufferSize);
  for (let i = 0; i < bufferSize; i++) {
    sinTable[i] = Math.sin(-Math.PI / i);
    cosTable[i] = Math.cos(-Math.PI / i);
  }

  // Bit-reversal reorder
  const real = new Float64Array(bufferSize);
  const imag = new Float64Array(bufferSize);
  for (let i = 0; i < bufferSize; i++) {
    real[i] = vals[reverseTable[i]];
    imag[i] = 0;
  }

  // Cooley-Tukey butterfly
  let halfSize = 1;
  while (halfSize < bufferSize) {
    let phaseR = cosTable[halfSize];
    let phaseI = sinTable[halfSize];
    let curR = 1, curI = 0;

    for (let fftStep = 0; fftStep < halfSize; fftStep++) {
      let i = fftStep;
      while (i < bufferSize) {
        const off = i + halfSize;
        const tr = curR * real[off] - curI * imag[off];
        const ti = curR * imag[off] + curI * real[off];
        real[off] = real[i] - tr;
        imag[off] = imag[i] - ti;
        real[i] += tr;
        imag[i] += ti;
        i += halfSize << 1;
      }
      const tmpR = curR;
      curR = tmpR * phaseR - curI * phaseI;
      curI = tmpR * phaseI + curI * phaseR;
    }
    halfSize <<= 1;
  }

  // Calculate magnitude spectrum (2/N * |X[k]|) for k = 0 .. bufferSize/2 - 1
  const bSi = 2 / bufferSize;
  const result: Matrix = {};
  for (let i = 0, half = bufferSize >> 1; i < half; i++) {
    result[`0-${i}`] = bSi * Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }

  void sampleRate; // used for bandwidth calc in old code; spectrum values don't depend on it
  return result;
};
