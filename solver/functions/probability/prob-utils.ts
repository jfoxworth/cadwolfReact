// Shared probability utility functions: lgamma, regularized incomplete gamma, incomplete beta.

// Lanczos approximation for log-gamma (same coefficients as utility/lgamma.ts)
const LG_G = 7;
const LG_C = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

export function lgammaScalar(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lgammaScalar(1 - z);
  }
  z -= 1;
  let x = LG_C[0]!;
  for (let i = 1; i < LG_G + 2; i++) x += LG_C[i]! / (z + i);
  const t = z + LG_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Regularized lower incomplete gamma P(a, x) using series for x < a+1, CF for x >= a+1.
export function regIncGamma(a: number, x: number): number {
  if (x <= 0) return 0;
  if (a <= 0) return 1;
  return x < a + 1 ? gSeries(a, x) : 1 - gCF(a, x);
}

// Upper regularized incomplete gamma Q(a, x) = 1 - P(a, x)
export function regIncGammaUpper(a: number, x: number): number {
  return 1 - regIncGamma(a, x);
}

function gSeries(a: number, x: number): number {
  const lnPre = a * Math.log(x) - x - lgammaScalar(a + 1);
  let sum = 1, term = 1;
  for (let n = 1; n < 300; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
  }
  return Math.exp(lnPre) * sum;
}

function gCF(a: number, x: number): number {
  // Lentz continued fraction for Q(a, x)
  const FPMIN = 1e-300;
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return Math.exp(a * Math.log(x) - x - lgammaScalar(a)) * h;
}

// Regularized incomplete beta I_x(a, b).
// Uses the continued fraction method (Numerical Recipes) with the symmetry relation.
export function betaInc(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const lbeta = lgammaScalar(a) + lgammaScalar(b) - lgammaScalar(a + b);

  // Use symmetry I_x(a,b) = 1 - I_{1-x}(b,a) when x > (a+1)/(a+b+2)
  const swapped = x > (a + 1) / (a + b + 2);
  const [aa, bb, xx] = swapped ? [b, a, 1 - x] : [a, b, x];

  const front = Math.exp(aa * Math.log(xx) + bb * Math.log(1 - xx) - lbeta);
  const cf = betaCF(aa, bb, xx);
  const result = front * cf / aa;
  return swapped ? 1 - result : result;
}

function betaCF(a: number, b: number, x: number): number {
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    // Even step
    let num = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + num * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + num / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    // Odd step
    num = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + num * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + num / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return h;
}

// Bisection inverse for a monotone CDF — find x such that cdf(x) = p.
export function cdfInverse(
  cdf: (x: number) => number,
  p: number,
  lo: number,
  hi: number
): number {
  if (p <= 0) return lo;
  if (p >= 1) return hi;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid; else hi = mid;
    if (hi - lo < 1e-12 * (1 + Math.abs(lo))) break;
  }
  return (lo + hi) / 2;
}
