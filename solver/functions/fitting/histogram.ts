import type { BuiltinFn, Matrix } from "../../types";

// histogram(data, bins)
//   data — 1-D vector of values
//   bins — scalar: number of uniform bins  OR  vector: explicit bin edges
//
// Returns a 2×N packed matrix:
//   row 0 = bin centers
//   row 1 = frequency density (count / (n * binWidth)) for each bin

function matToArray(m: Matrix): number[] {
  return Object.keys(m)
    .sort((a, b) => {
      const [ar, ac] = a.split("-").map(Number);
      const [br, bc] = b.split("-").map(Number);
      return ar !== br ? ar - br : ac - bc;
    })
    .map((k) => m[k]);
}

export const histogram: BuiltinFn = async (args, _ctx) => {
  const data = matToArray(args[0] ?? {});
  const binsArg = matToArray(args[1] ?? {});
  if (data.length === 0) return { "0-0": 0 };

  // Build bin edges
  let edges: number[];
  if (binsArg.length === 1) {
    // Scalar: uniform bins
    const numBins = Math.max(1, Math.round(binsArg[0]));
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    const range = hi - lo || 1;
    const step = range / numBins;
    edges = [];
    for (let i = 0; i <= numBins; i++) edges.push(lo + i * step);
  } else if (binsArg.length > 1) {
    // Vector: explicit bin edges (already sorted by user)
    edges = [...binsArg].sort((a, b) => a - b);
  } else {
    // Default: 10 uniform bins
    const numBins = 10;
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    const range = hi - lo || 1;
    const step = range / numBins;
    edges = [];
    for (let i = 0; i <= numBins; i++) edges.push(lo + i * step);
  }

  const numBins = edges.length - 1;
  const counts: number[] = new Array(numBins).fill(0);

  for (const val of data) {
    // Find bin via binary search
    let lo = 0, hi = numBins - 1;
    if (val < edges[0] || val > edges[numBins]) continue;
    if (val === edges[numBins]) { counts[numBins - 1]++; continue; }
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (val < edges[mid + 1]) hi = mid;
      else lo = mid + 1;
    }
    counts[lo]++;
  }

  const result: Matrix = {};
  for (let i = 0; i < numBins; i++) {
    const width  = edges[i + 1] - edges[i];
    const center = (edges[i] + edges[i + 1]) / 2;
    const density = width > 0 ? counts[i] / (data.length * width) : 0;
    result[`0-${i}`] = center;
    result[`1-${i}`] = density;
  }
  return result;
};
