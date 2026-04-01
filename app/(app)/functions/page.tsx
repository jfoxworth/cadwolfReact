import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Functions Reference — CadWolf",
  description:
    "Complete reference for all mathematical functions available in CadWolf equations.",
};

interface FnRow {
  name: string;
  signature: string;
  description: string;
  slug?: string;
}

interface Section {
  id: string;
  title: string;
  functions: FnRow[];
}

const SECTIONS: Section[] = [
  {
    id: "trig",
    title: "Trigonometric",
    functions: [
      {
        name: "sin",
        signature: "sin(x)",
        description: "Sine (radians)",
        slug: "WjbGRvnJZJ",
      },
      {
        name: "cos",
        signature: "cos(x)",
        description: "Cosine (radians)",
        slug: "WjbGRvnJZJ",
      },
      {
        name: "tan",
        signature: "tan(x)",
        description: "Tangent (radians)",
        slug: "WjbGRvnJZJ",
      },
      { name: "cot", signature: "cot(x)", description: "Cotangent — 1/tan(x)", slug: "Tbe0NcTRAZ" },
      { name: "sec", signature: "sec(x)", description: "Secant — 1/cos(x)", slug: "Tbe0NcTRAZ" },
      { name: "csc", signature: "csc(x)", description: "Cosecant — 1/sin(x)", slug: "Tbe0NcTRAZ" },
      {
        name: "asin",
        signature: "asin(x)",
        description: "Inverse sine, returns radians",
        slug: "wei6UWRrsj",
      },
      {
        name: "acos",
        signature: "acos(x)",
        description: "Inverse cosine, returns radians",
        slug: "wei6UWRrsj",
      },
      {
        name: "atan",
        signature: "atan(x)",
        description: "Inverse tangent, returns radians",
        slug: "wei6UWRrsj",
      },
      {
        name: "atan2",
        signature: "atan2(y, x)",
        description: "Two-argument inverse tangent — accounts for quadrant",
        slug: "b8cybQnE6b",
      },
      {
        name: "acot",
        signature: "acot(x)",
        description: "Inverse cotangent",
        slug: "h3UynxNWQl",
      },
      {
        name: "asec",
        signature: "asec(x)",
        description: "Inverse secant",
        slug: "h3UynxNWQl",
      },
      {
        name: "acsc",
        signature: "acsc(x)",
        description: "Inverse cosecant",
        slug: "h3UynxNWQl",
      },
      {
        name: "sinh",
        signature: "sinh(x)",
        description: "Hyperbolic sine",
        slug: "sZhCoMsf0k",
      },
      {
        name: "cosh",
        signature: "cosh(x)",
        description: "Hyperbolic cosine",
        slug: "sZhCoMsf0k",
      },
      {
        name: "tanh",
        signature: "tanh(x)",
        description: "Hyperbolic tangent",
        slug: "sZhCoMsf0k",
      },
      {
        name: "asinh",
        signature: "asinh(x)",
        description: "Inverse hyperbolic sine",
        slug: "epNKmZXbi6",
      },
      {
        name: "acosh",
        signature: "acosh(x)",
        description: "Inverse hyperbolic cosine",
        slug: "epNKmZXbi6",
      },
      {
        name: "atanh",
        signature: "atanh(x)",
        description: "Inverse hyperbolic tangent",
        slug: "epNKmZXbi6",
      },
      {
        name: "acoth",
        signature: "acoth(x)",
        description: "Inverse hyperbolic cotangent",
        slug: "CXePhOIjOm",
      },
      {
        name: "asech",
        signature: "asech(x)",
        description: "Inverse hyperbolic secant",
        slug: "CXePhOIjOm",
      },
      {
        name: "acsch",
        signature: "acsch(x)",
        description: "Inverse hyperbolic cosecant",
        slug: "CXePhOIjOm",
      },
      {
        name: "sinc",
        signature: "sinc(x)",
        description: "Normalized sinc function — sin(πx)/(πx)",
        slug: "h6mEhwOckG",
      },
      {
        name: "deg2rad",
        signature: "deg2rad(x)",
        description: "Convert degrees to radians",
        slug: "cDQIjAHqYN",
      },
      {
        name: "rad2deg",
        signature: "rad2deg(x)",
        description: "Convert radians to degrees",
        slug: "cDQIjAHqYN",
      },
    ],
  },
  {
    id: "basic",
    title: "Basic Math",
    functions: [
      {
        name: "abs",
        signature: "abs(x)",
        description: "Absolute value",
        slug: "tHk585d6kv",
      },
      { name: "sqrt", signature: "sqrt(x)", description: "Square root", slug: "0FhDeSsOXC" },
      {
        name: "exp",
        signature: "exp(x)",
        description: "e raised to the power x",
        slug: "jDqYBZCiyq",
      },
      {
        name: "sign",
        signature: "sign(x)",
        description: "Sign of x — returns −1, 0, or 1",
        slug: "A55-O8KbLg",
      },
      {
        name: "round",
        signature: "round(x, n)",
        description: "Round to n decimal places (default 0)",
        slug: "tHk585d6kv",
      },
      {
        name: "floor",
        signature: "floor(x, unit)",
        description: "Round down; optional unit sets the step size",
        slug: "WrVQv05St6",
      },
      {
        name: "ceil",
        signature: "ceil(x, unit)",
        description: "Round up; optional unit sets the step size",
        slug: "WrVQv05St6",
      },
      {
        name: "trunc",
        signature: "trunc(x)",
        description: "Truncate toward zero (drop decimal part)",
        slug: "4oDDEZTtj5",
      },
      {
        name: "mod",
        signature: "mod(x, n)",
        description: "Remainder of x divided by n",
        slug: "T5qD-SLWIy",
      },
      {
        name: "factorial",
        signature: "factorial(n)",
        description: "n! — factorial of n",
        slug: "q7sHRvv9OV",
      },
      {
        name: "nchoosek",
        signature: "nchoosek(n, k)",
        description: "Binomial coefficient C(n, k)",
        slug: "9HWPHjzbx1",
      },
      {
        name: "max",
        signature: "max(x)",
        description: "Maximum value in array x",
        slug: "LLO74nJ7K8",
      },
      {
        name: "min",
        signature: "min(x)",
        description: "Minimum value in array x",
        slug: "LLO74nJ7K8",
      },
      {
        name: "maxu",
        signature: "maxu(x, y)",
        description: "Element-wise maximum of two arrays",
        slug: "LLO74nJ7K8",
      },
      {
        name: "minu",
        signature: "minu(x, y)",
        description: "Element-wise minimum of two arrays",
        slug: "LLO74nJ7K8",
      },
      {
        name: "maxInd",
        signature: "maxInd(x)",
        description: "Index of the maximum value",
        slug: "Lccgcde8dk",
      },
      {
        name: "minInd",
        signature: "minInd(x)",
        description: "Index of the minimum value",
        slug: "3Mw2h7MGEw",
      },
      {
        name: "hypot",
        signature: "hypot(x, y)",
        description: "Hypotenuse — sqrt(x² + y²)",
        slug: "xbNSvZ8Ggx",
      },
      {
        name: "gcd",
        signature: "gcd(a, b)",
        description: "Greatest common divisor",
        slug: "u0EBll-ICC",
      },
      {
        name: "lcm",
        signature: "lcm(a, b)",
        description: "Least common multiple",
        slug: "lhZG9ld2mK",
      },
      {
        name: "cbrt",
        signature: "cbrt(x)",
        description:
          "Cube root of x — equivalent to x^(1/3), works for negative x",
        slug: "DQmVjxdHvU",
      },
      {
        name: "log1p",
        signature: "log1p(x)",
        description: "Natural log of (1 + x) — numerically stable near x = 0",
        slug: "_ZW8r2hQXQ",
      },
      {
        name: "expm1",
        signature: "expm1(x)",
        description: "e^x − 1 — numerically stable near x = 0",
        slug: "PCrBmVJYlm",
      },
    ],
  },
  {
    id: "log",
    title: "Logarithms & Powers",
    functions: [
      {
        name: "ln",
        signature: "ln(x)",
        description: "Natural logarithm (base e)",
        slug: "WFQVbVE3Vh",
      },
      {
        name: "log",
        signature: "log(x, base)",
        description: "Logarithm — default base 10, or specify base",
        slug: "WFQVbVE3Vh",
      },
      {
        name: "log10",
        signature: "log10(x)",
        description: "Base-10 logarithm",
        slug: "WFQVbVE3Vh",
      },
      { name: "log2", signature: "log2(x)", description: "Base-2 logarithm", slug: "3HuZ5jNysy" },
      {
        name: "power",
        signature: "power(exp, base)",
        description: "base raised to the power exp (element-wise base)",
        slug: "wUleO5l06n",
      },
      {
        name: "root",
        signature: "root(n, x)",
        description: "nth root of x — equivalent to x^(1/n)",
        slug: "xVy0tSVY-v",
      },
    ],
  },
  {
    id: "matrix",
    title: "Matrix & Array",
    functions: [
      {
        name: "zeros",
        signature: "zeros(m, n)",
        description: "Create an m × n matrix of zeros",
        slug: "vxyzSmWi2p",
      },
      {
        name: "ones",
        signature: "ones(m, n)",
        description: "Create an m × n matrix of ones",
        slug: "6M4FQS4-LB",
      },
      {
        name: "full",
        signature: "full(m, n, val)",
        description:
          "Create an m × n matrix filled with val. full(m, val) creates an m × m matrix",
        slug: "wOWfRzlaNJ",
      },
      {
        name: "create-matrix",
        signature: "create-matrix(val, 0, rows, cols)",
        description: "Create a rows × cols matrix filled with val",
        slug: "Dixpywou3m",
      },
      {
        name: "identity",
        signature: "identity(n)",
        description: "Create an n × n identity matrix",
        slug: "Gjx3SyCmK0",
      },
      {
        name: "transpose",
        signature: "transpose(A)",
        description: "Transpose of matrix A",
        slug: "VNVCxgjatI",
      },
      {
        name: "size",
        signature: "size(A, dim)",
        description: "Size along dimension (1 = rows, 2 = cols)",
        slug: "w7MVJbZhFN",
      },
      {
        name: "length",
        signature: "length(A)",
        description: "Length of the largest dimension",
        slug: "431V1DGkRj",
      },
      {
        name: "num-el",
        signature: "num-el(A)",
        description: "Total number of elements in A",
        slug: "zBAUonRXZh",
      },
      {
        name: "reshape",
        signature: "reshape(A, m, n)",
        description: "Reshape A into m × n (column-major order)",
        slug: "g9jWv29Pch",
      },
      {
        name: "diag",
        signature: "diag(A, k)",
        description:
          "Extract diagonal (or construct diagonal matrix from vector)",
        slug: "M7iG6jg7Ad",
      },
      {
        name: "tril",
        signature: "tril(A, k)",
        description: "Lower triangular part of A (offset k)",
        slug: "vEPDjoEoix",
      },
      {
        name: "matur",
        signature: "matur(A, k)",
        description:
          "Upper-right portion of A (strictly above diagonal); k offsets from diagonal",
        slug: "VwmjlTSP2o",
      },
      {
        name: "matll",
        signature: "matll(A, k)",
        description:
          "Lower-left portion of A (strictly below diagonal); k offsets from diagonal",
        slug: "VwmjlTSP2o",
      },
      {
        name: "triu",
        signature: "triu(A, k)",
        description: "Upper triangular part of A (offset k)",
        slug: "kWevzBXQus",
      },
      {
        name: "fliplr",
        signature: "fliplr(A)",
        description: "Flip matrix left-to-right",
        slug: "zgxNv4sp4n",
      },
      {
        name: "flipud",
        signature: "flipud(A)",
        description: "Flip matrix up-to-down",
        slug: "zgxNv4sp4n",
      },
      {
        name: "repmat",
        signature: "repmat(A, m, n)",
        description: "Tile A: m times vertically, n times horizontally",
        slug: "4DVLtBbl3D",
      },
      {
        name: "norm",
        signature: "norm(A, p)",
        description: "p-norm of a matrix or vector (default p=2)",
        slug: "PaoBb4FI-G",
      },
      {
        name: "trace",
        signature: "trace(A)",
        description: "Sum of diagonal elements",
        slug: "54ybnYOIQk",
      },
      {
        name: "dot",
        signature: "dot(A, B, dim)",
        description: "Dot product along dimension (default 2)",
        slug: "B93hYmogpz",
      },
      {
        name: "cross",
        signature: "cross(A, B)",
        description: "Cross product of two 1 × 3 vectors",
        slug: "2_2rfdlQpR",
      },
      {
        name: "kron",
        signature: "kron(A, B)",
        description: "Kronecker tensor product",
        slug: "dhhVZe-3w0",
      },
      {
        name: "conj",
        signature: "conj(A)",
        description:
          "Complex conjugate (returns real part, pipeline is real-only)",
        slug: "sw4q95pIh3",
      },
      {
        name: "dot-mult",
        signature: "dot-mult(A, B)",
        description: "Element-wise multiplication A .* B",
        slug: "lUZPzlsRNr",
      },
      {
        name: "dot-div",
        signature: "dot-div(A, B)",
        description: "Element-wise division A ./ B",
        slug: "_wJF9_aoij",
      },
      {
        name: "threshold",
        signature: "threshold(A, t)",
        description: "Set elements below threshold t to zero",
        slug: "mympRt5D4l",
      },
      {
        name: "col2mat",
        signature: "col2mat(v, n)",
        description: "Broadcast column vector v to n columns",
        slug: "pAJW3yEEgK",
      },
      {
        name: "row2mat",
        signature: "row2mat(v, m)",
        description: "Broadcast row vector v to m rows",
        slug: "pAJW3yEEgK",
      },
      {
        name: "rotate",
        signature: "rotate(v, angle)",
        description: "Rotate 2D vector v by angle (radians)",
        slug: "78aRLcVV0z",
      },
      {
        name: "isrow",
        signature: "isrow(A)",
        description: "Returns 1 if A is a row vector (1 × N, N > 1), else 0",
        slug: "uOT8ffrLvi",
      },
      {
        name: "iscolumn",
        signature: "iscolumn(A)",
        description: "Returns 1 if A is a column vector (N × 1, N > 1), else 0",
        slug: "uOT8ffrLvi",
      },
      {
        name: "ismatrix",
        signature: "ismatrix(A)",
        description:
          "Returns 1 if A is a true matrix (M × N, M > 1 and N > 1), else 0",
        slug: "uOT8ffrLvi",
      },
    ],
  },
  {
    id: "linalg",
    title: "Linear Algebra",
    functions: [
      {
        name: "det",
        signature: "det(A)",
        description: "Determinant via LU decomposition",
        slug: "cK59Kjjb0D",
      },
      {
        name: "inverse-lu",
        signature: "inverse-lu(A)",
        description: "Matrix inverse via LU decomposition",
        slug: "nPEmjVMEXi",
      },
      {
        name: "solve",
        signature: "solve(A, b)",
        description: "Solve the linear system A·x = b",
        slug: "LfIwbr9GTO",
      },
      {
        name: "eig",
        signature: "eig(A)",
        description: "Eigenvalues of A via Jacobi iteration",
        slug: "IanU3PRBhX",
      },
      {
        name: "lu-decomp",
        signature: "lu-decomp(A)",
        description: "LU decomposition — returns L and U factors",
        slug: "tHjGHTAAxl",
      },
      {
        name: "cholesky",
        signature: "cholesky(A)",
        description:
          "Cholesky decomposition A = L·Lᵀ (A must be symmetric positive-definite)",
        slug: "eUwmVMwGly",
      },
      {
        name: "svd",
        signature: "svd(A)",
        description: "Singular Value Decomposition — returns U, S, V",
        slug: "bNQvT1j3f9",
      },
      {
        name: "mat-pow",
        signature: "mat-pow(A, n)",
        description: "Matrix raised to integer power n",
        slug: "hBLzsiIyQl",
      },
      {
        name: "gauss-e",
        signature: "gauss-e(A)",
        description: "Gaussian elimination with partial pivoting",
        slug: "1cfsMyCcEf",
      },
      {
        name: "cs-norm",
        signature: "cs-norm(A)",
        description: "Column-scaled norm",
        slug: "HKMltf9q5L",
      },
      {
        name: "rs-norm",
        signature: "rs-norm(A)",
        description: "Row-scaled norm",
        slug: "HKMltf9q5L",
      },
      {
        name: "is-pos-def",
        signature: "is-pos-def(A)",
        description: "Returns 1 if A is positive-definite, else 0",
        slug: "-JysJcvija",
      },
      {
        name: "pinv",
        signature: "pinv(A)",
        description:
          "Moore-Penrose pseudoinverse — works for rectangular and singular matrices",
        slug: "RGDOAROZDi",
      },
      {
        name: "lstsq",
        signature: "lstsq(A, b)",
        description:
          "Least-squares solution to A·x ≈ b — minimises ||Ax − b||₂",
        slug: "y4zT0yKQyF",
      },
      {
        name: "rank",
        signature: "rank(A)",
        description:
          "Numerical rank of A — count of singular values above machine-epsilon threshold",
        slug: "PMcL_TZkEn",
      },
      {
        name: "expm",
        signature: "expm(A)",
        description:
          "Matrix exponential e^A via scaling-and-squaring (square matrices only)",
        slug: "xSGlKt4UMJ",
      },
      {
        name: "qr",
        signature: "qr(A, which)",
        description:
          "QR decomposition — which=1 (default) returns Q (orthonormal columns), which=2 returns R (upper triangular)",
        slug: "QIcjJPimOw",
      },
      {
        name: "cond",
        signature: "cond(A)",
        description:
          "2-norm condition number — ratio of largest to smallest singular value; Inf for singular matrices",
        slug: "-UQrQSW1PR",
      },
      {
        name: "null-space",
        signature: "null-space(A)",
        description:
          "Basis for the null space of A — columns of the returned matrix satisfy A·x = 0",
        slug: "9_E0ewFAT2",
      },
      {
        name: "orth",
        signature: "orth(A)",
        description:
          "Orthonormal basis for the column space of A — economy QR columns corresponding to non-negligible R diagonals",
        slug: "1p4tm7Q73f",
      },
    ],
  },
  {
    id: "stats",
    title: "Statistics",
    functions: [
      {
        name: "mean",
        signature: "mean(x)",
        description: "Arithmetic mean",
        slug: "jKpziAuhFK",
      },
      {
        name: "median",
        signature: "median(x)",
        description: "Median value",
        slug: "jKpziAuhFK",
      },
      {
        name: "mode",
        signature: "mode(x)",
        description: "Most frequent value",
        slug: "jKpziAuhFK",
      },
      {
        name: "stdev",
        signature: "stdev(x)",
        description: "Sample standard deviation",
        slug: "GuuS4cCTZt",
      },
      {
        name: "variance",
        signature: "variance(x)",
        description: "Sample variance",
        slug: "zdVeKdWQAh",
      },
      {
        name: "sum",
        signature: "sum(x)",
        description: "Sum of all elements",
        slug: "_mksBiJ6nB",
      },
      { name: "cumsum", signature: "cumsum(x)", description: "Cumulative sum", slug: "5LwLywInNB" },
      {
        name: "diff",
        signature: "diff(x)",
        description:
          "First-order finite differences between consecutive elements",
        slug: "CR-R9s4-Av",
      },
      {
        name: "range",
        signature: "range(x)",
        description: "Max minus min",
        slug: "jKpziAuhFK",
      },
      {
        name: "percentile",
        signature: "percentile(x, p)",
        description: "pth percentile (p in 0–100)",
        slug: "W9taealtU3",
      },
      {
        name: "quantile",
        signature: "quantile(x, p)",
        description: "pth quantile (p in 0–1)",
        slug: "-Lx2Xyn28q",
      },
      {
        name: "corr",
        signature: "corr(x, y)",
        description: "Pearson correlation coefficient",
        slug: "TDoTO-4EOn",
      },
      { name: "cov", signature: "cov(x, y)", description: "Sample covariance", slug: "pTQQYF0upQ" },
      {
        name: "skewness",
        signature: "skewness(x)",
        description: "Sample skewness (bias-corrected)",
        slug: "wwLvU0MF0a",
      },
      {
        name: "kurtosis",
        signature: "kurtosis(x)",
        description: "Excess kurtosis (bias-corrected)",
        slug: "qL3q9DZ8N4",
      },
      {
        name: "cv",
        signature: "cv(x)",
        description: "Coefficient of variation — stdev / mean",
        slug: "zdVeKdWQAh",
      },
      {
        name: "prod",
        signature: "prod(x)",
        description: "Product of all elements in x",
        slug: "1FdhAcMQBm",
      },
      {
        name: "cumprod",
        signature: "cumprod(x)",
        description:
          "Cumulative product — each element is the product of all preceding values",
        slug: "8nSdm7j6B6",
      },
      {
        name: "cummax",
        signature: "cummax(x)",
        description:
          "Running maximum — each element is the largest value seen so far",
        slug: "bbfHyUDOq3",
      },
      {
        name: "cummin",
        signature: "cummin(x)",
        description:
          "Running minimum — each element is the smallest value seen so far",
        slug: "2LPJdlI_o2",
      },
    ],
  },
  {
    id: "data",
    title: "Data & Arrays",
    functions: [
      {
        name: "linspace",
        signature: "linspace(start, stop, n)",
        description:
          "n evenly-spaced values from start to stop (inclusive). Default n = 100",
        slug: "eBFvOvygzI",
      },
      {
        name: "arange",
        signature: "arange(start, stop, step)",
        description:
          "Values from start up to (not including) stop, incremented by step. arange(stop) starts at 0 with step 1",
        slug: "rjeRbWYu1O",
      },
      {
        name: "logspace",
        signature: "logspace(start, stop, n)",
        description:
          "n logarithmically-spaced values from 10^start to 10^stop (inclusive). Default n = 50",
        slug: "htJXJNE4fP",
      },
      {
        name: "int-vec",
        signature: "int-vec(xdata, ydata)",
        description:
          "Cumulative trapezoidal integration over unevenly-spaced data (like MATLAB cumtrapz)",
        slug: "doc-intvec",
      },
      {
        name: "append",
        signature: "append(A, B, dim)",
        description:
          "Concatenate A and B along dim (0 = vertical, 1 = horizontal)",
        slug: "doc-append",
      },
      {
        name: "sort",
        signature: "sort(x, dir)",
        description:
          "Sort vector — dir ≥ 0 = ascending (default), < 0 = descending",
        slug: "doc-sort00",
      },
      {
        name: "unique",
        signature: "unique(x)",
        description: "Sorted array of unique elements",
        slug: "doc-unique",
      },
      {
        name: "all",
        signature: "all(x)",
        description: "1 if all elements are nonzero, else 0",
        slug: "doc-all000",
      },
      {
        name: "any",
        signature: "any(x)",
        description: "1 if any element is nonzero, else 0",
        slug: "doc-any000",
      },
      {
        name: "rand",
        signature: "rand(lower, upper, precision)",
        description:
          "Random number in [lower, upper] rounded to given precision",
        slug: "tWqiQegq-9 ",
      },
      {
        name: "rand-mat",
        signature: "rand-mat(lower, upper, precision, rows, cols)",
        description:
          "Matrix of random values between lower and upper, quantized to given precision",
        slug: "doc-randmt",
      },
      {
        name: "num-inds",
        signature: "num-inds(x)",
        description:
          "Number of index dimensions — 1 for scalar, 2 for vector or matrix",
        slug: "doc-numind",
      },
      {
        name: "first-pos",
        signature: "first-pos(x, dim)",
        description:
          "Index of the first zero-crossing (≤0 to >0) in a vector or matrix; dim selects scan direction",
        slug: "5y-3XK2s7o",
      },
      {
        name: "clip",
        signature: "clip(x, lo, hi)",
        description: "Clamp every element of x to the range [lo, hi]",
        slug: "lKa56TSRcS",
      },
      {
        name: "argsort",
        signature: "argsort(x, dir)",
        description:
          "Indices that would sort x — dir ≥ 0 ascending (default), < 0 descending",
        slug: "yWBrRGxPW9",
      },
      {
        name: "nonzero",
        signature: "nonzero(x)",
        description:
          "Row vector of 0-based indices where x is nonzero (row-major order)",
        slug: "VffxjPtmtc",
      },
      {
        name: "meshgrid",
        signature: "meshgrid(x, y, which)",
        description:
          "Coordinate grid from vectors x and y — which=1 (default) returns X, which=2 returns Y",
        slug: "Z6wraqqH74",
      },
      {
        name: "flatten",
        signature: "flatten(A)",
        description: "Collapse matrix A to a row vector scanning row by row",
        slug: "c82CKMk4hF",
      },
      {
        name: "roll",
        signature: "roll(x, n)",
        description:
          "Circularly shift elements of x by n positions (positive = right, negative = left)",
        slug: "T6uTCkxCLP",
      },
      {
        name: "repeat",
        signature: "repeat(x, n)",
        description: "Repeat each element of x n times, in order",
        slug: "DY0er3GQZ0",
      },
      {
        name: "where",
        signature: "where(cond, a, b)",
        description:
          "Element-wise conditional — returns a[i] where cond[i] ≠ 0, else b[i]",
        slug: "jSEeFACp5k",
      },
      {
        name: "count-nonzero",
        signature: "count-nonzero(x)",
        description: "Count of elements that are not zero",
        slug: "wRUedcoRmC",
      },
      {
        name: "searchsorted",
        signature: "searchsorted(a, v)",
        description:
          "Index where v would be inserted to keep sorted array a ordered (right-biased)",
        slug: "3Ke7sNv-yW",
      },
    ],
  },
  {
    id: "calculus",
    title: "Calculus",
    functions: [
      {
        name: "derivative",
        signature: "derivative(y, h, order, accuracy)",
        description:
          "Centered finite-difference derivative of y with spacing h",
        slug: "Dj-vdbUN3w",
      },
      {
        name: "derivative-un",
        signature: "derivative-un(x, y, order)",
        description: "Derivative of unevenly-spaced data",
        slug: "70iXC8xaiI",
      },
      {
        name: "integrate",
        signature: "integrate(x, y)",
        description: "Trapezoidal integration over unevenly-spaced (x, y) data",
        slug: "fbTbqvHOPM",
      },
      {
        name: "trapz",
        signature: "trapz(y, x)",
        description: "Trapezoidal numerical integration",
        slug: "RUdE4jSO2a",
      },
      {
        name: "cumtrapz",
        signature: "cumtrapz(y, x)",
        description: "Cumulative trapezoidal integration",
        slug: "ueaklGm7H6",
      },
      {
        name: "gradient",
        signature: "gradient(v, h)",
        description: "Central-difference gradient of vector v with spacing h",
        slug: "Ff0WHOw7uh",
      },
      {
        name: "newton-cotes",
        signature: "newton-cotes(x, y, order)",
        description:
          "Newton-Cotes integration — order 1: Trapezoid, 2: Simpson's 1/3, 3: Simpson's 3/8, 4: Boole's rule",
        slug: "WpWqdHTDM1",
      },
    ],
  },
  {
    id: "numerical",
    title: "Numerical Methods",
    functions: [
      {
        name: "bisect",
        signature: "bisect(f, xl, xu, es, maxit)",
        description: "Bisection method — find root of f in [xl, xu]",
        slug: "daNkYIA3xE",
      },
      {
        name: "secant",
        signature: "secant(f, x1, x2, es, maxit)",
        description: "Secant method root-finding starting from x1 and x2",
        slug: "viyWJVEL5q",
      },
      {
        name: "false-pos",
        signature: "false-pos(f, xl, xu, es, maxit)",
        description: "False-position (regula falsi) root-finding in [xl, xu]",
        slug: "SVaS9BXNEH",
      },
      {
        name: "inc-search",
        signature: "inc-search(f, xmin, xmax, ns)",
        description: "Incremental search — finds brackets where f changes sign",
        slug: "K7KaWHptIV",
      },
      {
        name: "ode4",
        signature: "ode4(k1, k2, k3, k4, y, h)",
        description: "Fourth-order Runge-Kutta ODE step",
        slug: "80RVpWMWAh",
      },
    ],
  },
  {
    id: "fitting",
    title: "Curve Fitting",
    functions: [
      {
        name: "polyfit",
        signature: "polyfit(order, x, y)",
        description: "Polynomial fit of given order — returns coefficients",
        slug: "A-gxCbUxfk",
      },
      {
        name: "expfit",
        signature: "expfit(x, y)",
        description: "Exponential fit y = C·e^(B·x)",
        slug: "_6iZsyrwWq",
      },
      {
        name: "logfit",
        signature: "logfit(x, y)",
        description: "Logarithmic fit y = A + B·ln(x)",
        slug: "X7K05Zyy1k",
      },
      {
        name: "powerfit",
        signature: "powerfit(x, y)",
        description: "Power fit y = A·x^B",
        slug: "UGcPLBb7st",
      },
      {
        name: "histogram",
        signature: "histogram(data, bins)",
        description:
          "Compute histogram — returns bin centers and frequency density",
        slug: "kErFM6K1Xu",
      },
    ],
  },
  {
    id: "signal",
    title: "Signal Processing",
    functions: [
      {
        name: "fft",
        signature: "fft(data, sampleRate)",
        description:
          "Fast Fourier Transform (Cooley-Tukey radix-2) — returns frequency and magnitude",
        slug: "bgTgpTjeCu",
      },
      {
        name: "conv",
        signature: "conv(x, h)",
        description: "Discrete linear convolution of x and h",
        slug: "Uxe5cIBjPp",
      },
      {
        name: "fourier",
        signature: "fourier(data)",
        description:
          "Discrete Fourier Transform (direct O(N²) — use fft for large arrays)",
        slug: "bgTgpTjeCu",
      },
    ],
  },
  {
    id: "utility",
    title: "Utility & Special Functions",
    functions: [
      { name: "erf", signature: "erf(x)", description: "Error function", slug: "vTvN5KT4Dj" },
      {
        name: "erfc",
        signature: "erfc(x)",
        description: "Complementary error function — 1 − erf(x)",
        slug: "KN7zRJhEH0",
      },
      {
        name: "gamma",
        signature: "gamma(x)",
        description: "Gamma function Γ(x)",
        slug: "LHXH8WH_9S",
      },
      {
        name: "lgamma",
        signature: "lgamma(x)",
        description: "Natural log of the gamma function",
        slug: "HO3qEdL9mk",
      },
      {
        name: "interpolate",
        signature: "interpolate(v, n)",
        description:
          "Insert n evenly-spaced points between each pair of values in v",
        slug: "1LAhiGRWmK",
      },
      {
        name: "spline",
        signature: "spline(x, y, xi)",
        description: "Cubic spline interpolation — evaluate at points xi",
        slug: "WmtrudvIlo",
      },
      {
        name: "real",
        signature: "real(A)",
        description: "Real part of A (passthrough — solver is real-only)",
        slug: "_RnJovNc5j",
      },
      {
        name: "imag",
        signature: "imag(A)",
        description: "Imaginary part of A (always returns zero)",
        slug: "_RnJovNc5j",
      },
      {
        name: "parse-date",
        signature: "parse-date(str)",
        description: "Parse a date string and return a numeric timestamp",
        slug: "C-kzMlNqLC",
      },
    ],
  },
  {
    id: "probability",
    title: "Probability Distributions",
    functions: [
      {
        name: "normcdf",
        signature: "normcdf(x, mu, sigma)",
        description:
          "Normal (Gaussian) CDF — P(X ≤ x) with given mean and standard deviation",
        slug: "w5X_W_wryS",
      },
      {
        name: "norminv",
        signature: "norminv(p)",
        description: "Inverse normal CDF (quantile function)",
        slug: "bfTlJhGZ24",
      },
      {
        name: "tcdf",
        signature: "tcdf(t, df)",
        description: "Student's t CDF — P(T ≤ t) with df degrees of freedom",
        slug: "4OIdz-7bIj",
      },
      {
        name: "tinv",
        signature: "tinv(p, df)",
        description: "Inverse Student's t CDF — t such that P(T ≤ t) = p",
        slug: "lPMMEu0hQy",
      },
      {
        name: "chi2cdf",
        signature: "chi2cdf(x, k)",
        description: "Chi-squared CDF — P(X ≤ x) with k degrees of freedom",
        slug: "96G2W1u9bn",
      },
      {
        name: "chi2inv",
        signature: "chi2inv(p, k)",
        description: "Inverse chi-squared CDF — x such that P(X ≤ x) = p",
        slug: "UdnhGXXIWT",
      },
      {
        name: "fcdf",
        signature: "fcdf(x, d1, d2)",
        description:
          "F distribution CDF — P(X ≤ x) with d1 numerator and d2 denominator degrees of freedom",
        slug: "rhKuGDQ4wz",
      },
      {
        name: "finv",
        signature: "finv(p, d1, d2)",
        description: "Inverse F distribution CDF",
        slug: "3xR9wrlrey",
      },
      {
        name: "binocdf",
        signature: "binocdf(k, n, p)",
        description: "Binomial CDF — P(X ≤ k) for X ~ Binomial(n, p)",
        slug: "fV-EX83bSm",
      },
      {
        name: "binopdf",
        signature: "binopdf(k, n, p)",
        description: "Binomial PMF — P(X = k) for X ~ Binomial(n, p)",
        slug: "88KlpsDdDF",
      },
      {
        name: "poisscdf",
        signature: "poisscdf(k, lambda)",
        description: "Poisson CDF — P(X ≤ k) for X ~ Poisson(λ)",
        slug: "NFqC91Ny5f",
      },
      {
        name: "expcdf",
        signature: "expcdf(x, mu)",
        description: "Exponential CDF — P(X ≤ x) with mean mu (default 1)",
        slug: "JyFUCBoMik",
      },
      {
        name: "randn",
        signature: "randn(rows, cols)",
        description:
          "Matrix of standard-normal random values via Box-Muller transform",
        slug: "8DvvbUgCt9",
      },
    ],
  },
  {
    id: "programming",
    title: "Programming Structures",
    functions: [
      {
        name: "if-else",
        signature: "if-else(val, op, cmp, trueVal, falseVal)",
        description:
          "Conditional: returns trueVal if (val op cmp) is true, else falseVal. Operators: <, >, <=, >=, ==, !=",
        slug: "OL0iQWHwp7",
      },
    ],
  },
];

function FunctionTable({ functions }: { functions: FnRow[] }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-200 text-left">
          <th className="py-2 pr-4 font-semibold text-gray-700 w-32">
            Function
          </th>
          <th className="py-2 pr-4 font-semibold text-gray-700 w-72">
            Signature
          </th>
          <th className="py-2 font-semibold text-gray-700">Description</th>
        </tr>
      </thead>
      <tbody>
        {functions.map((fn) => (
          <tr
            key={fn.name}
            className="border-b border-gray-100 hover:bg-gray-50"
          >
            <td className="py-2 pr-4 font-mono text-blue-700 font-medium">
              {fn.slug ? (
                <Link
                  href={`/document/${fn.slug}`}
                  className="underline decoration-blue-400 hover:text-blue-900"
                >
                  {fn.name}
                </Link>
              ) : (
                fn.name
              )}
            </td>
            <td className="py-2 pr-4 font-mono text-gray-600 text-xs">
              {fn.signature}
            </td>
            <td className="py-2 text-gray-600">{fn.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function FunctionsPage() {
  return (
    <div className="relative z-[1] bg-white max-w-5xl mx-auto px-6 py-10 mt-[75px] rounded-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Functions Reference
        </h1>
        <p className="text-gray-500">
          All mathematical functions available in CadWolf equations, organized
          by category.
        </p>
      </div>

      {/* Jump links */}
      <div className="flex flex-wrap gap-2 mb-10">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors"
          >
            {s.title}
          </a>
        ))}
      </div>

      <div className="flex flex-col gap-12">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              {s.title}
            </h2>
            <FunctionTable functions={s.functions} />
          </section>
        ))}
      </div>
    </div>
  );
}
