import type { BuiltinFn } from "../types";

// Trig
import { sin }   from "./trig/sin";
import { cos }   from "./trig/cos";
import { tan }   from "./trig/tan";
import { asin }  from "./trig/asin";
import { acos }  from "./trig/acos";
import { atan }  from "./trig/atan";
import { atan2 } from "./trig/atan2";
import { sinh }  from "./trig/sinh";
import { cosh }  from "./trig/cosh";
import { tanh }  from "./trig/tanh";
import { asinh } from "./trig/asinh";
import { acosh } from "./trig/acosh";
import { atanh } from "./trig/atanh";
import { sec }   from "./trig/sec";
import { csc }   from "./trig/csc";
import { cot }   from "./trig/cot";
import { asec }  from "./trig/asec";
import { acsc }  from "./trig/acsc";
import { acot }  from "./trig/acot";
import { asech } from "./trig/asech";
import { acsch } from "./trig/acsch";
import { acoth } from "./trig/acoth";

// Log / power
import { ln }    from "./log/ln";
import { log10 } from "./log/log10";
import { log2 }  from "./log/log2";
import { log }   from "./log/log";
import { root }  from "./log/root";
import { power } from "./log/power";

// Basic
import { cbrt }   from "./basic/cbrt";
import { log1p }  from "./basic/log1p";
import { expm1 }  from "./basic/expm1";
import { abs }    from "./basic/abs";
import { floor }  from "./basic/floor";
import { ceil }   from "./basic/ceil";
import { round }  from "./basic/round";
import { max }    from "./basic/max";
import { min }    from "./basic/min";
import { maxu }   from "./basic/maxu";
import { minu }   from "./basic/minu";
import { maxInd } from "./basic/maxInd";
import { minInd } from "./basic/minInd";
import { sign }   from "./basic/sign";
import { deg2rad }  from "./basic/deg2rad";
import { rad2deg }  from "./basic/rad2deg";
import { exp }      from "./basic/exp";
import { sqrt }     from "./basic/sqrt";
import { trunc }    from "./basic/trunc";
import { mod }      from "./basic/mod";
import { hypot }    from "./basic/hypot";
import { isnan }    from "./basic/isnan";
import { isinf }    from "./basic/isinf";
import { factorial } from "./basic/factorial";
import { nchoosek }  from "./basic/nchoosek";
import { gcd }       from "./basic/gcd";
import { lcm }       from "./basic/lcm";

// Stats
import { mean }     from "./stats/mean";
import { sum }      from "./stats/sum";
import { median }   from "./stats/median";
import { mode }     from "./stats/mode";
import { range }    from "./stats/range";
import { stdev }    from "./stats/stdev";
import { variance } from "./stats/variance";
import { cv }         from "./stats/cv";
import { percentile } from "./stats/percentile";
import { quantile }   from "./stats/quantile";
import { cumsum }     from "./stats/cumsum";
import { diff }       from "./stats/diff";
import { skewness }   from "./stats/skewness";
import { kurtosis }   from "./stats/kurtosis";
import { corr }       from "./stats/corr";
import { cov }        from "./stats/cov";
import { prod }       from "./stats/prod";
import { cumprod }    from "./stats/cumprod";
import { cummax }     from "./stats/cummax";
import { cummin }     from "./stats/cummin";

// Fitting
import { polyfit }    from "./fitting/polyfit";
import { powerfit }   from "./fitting/powerfit";
import { logfit }     from "./fitting/logfit";
import { expfit }     from "./fitting/expfit";
import { histogram }  from "./fitting/histogram";

// Matrix
import { transpose }  from "./matrix/transpose";
import { size }       from "./matrix/size";
import { createMatrix } from "./matrix/create-matrix";
import { identity }   from "./matrix/identity";
import { norm }       from "./matrix/norm";
import { csNorm }     from "./matrix/cs-norm";
import { rsNorm }     from "./matrix/rs-norm";
import { trace }      from "./matrix/trace";
import { conj }       from "./matrix/conj";
import { dotMult }    from "./matrix/dot-mult";
import { dotDiv }     from "./matrix/dot-div";
import { dot }        from "./matrix/dot";
import { cross }      from "./matrix/cross";
import { threshold }  from "./matrix/threshold";
import { isColumn }   from "./matrix/is-column";
import { isRow }      from "./matrix/is-row";
import { isMatrix }   from "./matrix/is-matrix";
import { numEl }      from "./matrix/num-el";
import { length }     from "./matrix/length";
import { fliplr }     from "./matrix/fliplr";
import { flipud }     from "./matrix/flipud";
import { diag }       from "./matrix/diag";
import { zeros }      from "./matrix/zeros";
import { ones }       from "./matrix/ones";
import { full }       from "./matrix/full";
import { reshape }    from "./matrix/reshape";
import { repmat }     from "./matrix/repmat";
import { triu }       from "./matrix/triu";
import { tril }       from "./matrix/tril";
import { matur }      from "./matrix/matur";
import { matll }      from "./matrix/matll";
import { kron }       from "./matrix/kron";

// Linear algebra
import { cholesky }   from "./linear-algebra/cholesky";
import { luDecomp }   from "./linear-algebra/lu-decomp";
import { inverseLu }  from "./linear-algebra/inverse-lu";
import { gaussE }     from "./linear-algebra/gauss-e";
import { squash }     from "./linear-algebra/squash";
import { det }        from "./linear-algebra/det";
import { matPow }     from "./linear-algebra/mat-pow";
import { solve }      from "./linear-algebra/solve";
import { eig }        from "./linear-algebra/eig";
import { svd }        from "./linear-algebra/svd";
import { pinv }       from "./linear-algebra/pinv";
import { lstsq }      from "./linear-algebra/lstsq";
import { rank }       from "./linear-algebra/rank";
import { expm }       from "./linear-algebra/expm";
import { qr }         from "./linear-algebra/qr";
import { cond }       from "./linear-algebra/cond";
import { nullSpace }  from "./linear-algebra/null-space";
import { orth }       from "./linear-algebra/orth";

// Probability
import { tcdf }       from "./probability/tcdf";
import { tinv }       from "./probability/tinv";
import { chi2cdf }    from "./probability/chi2cdf";
import { chi2inv }    from "./probability/chi2inv";
import { fcdf }       from "./probability/fcdf";
import { finv }       from "./probability/finv";
import { binocdf }    from "./probability/binocdf";
import { binopdf }    from "./probability/binopdf";
import { poisscdf }   from "./probability/poisscdf";
import { expcdf }     from "./probability/expcdf";
import { randn }      from "./probability/randn";

// Calculus
import { integrate }    from "./calculus/integrate";
import { derivative }   from "./calculus/derivative";
import { derivativeUn } from "./calculus/derivative-un";
import { trapz }        from "./calculus/trapz";
import { cumtrapz }     from "./calculus/cumtrapz";
import { gradient }     from "./calculus/gradient";
import { newtonCotes }  from "./calculus/newton-cotes";

// Numerical
import { incSearch } from "./numerical/inc-search";
import { bisect }    from "./numerical/bisect";
import { falsePos }  from "./numerical/false-pos";
import { secant }    from "./numerical/secant";
import { ode4 }      from "./numerical/ode4";

// Signal
import { fft }     from "./signal/fft";
import { fourier } from "./signal/fourier";
import { conv }    from "./signal/conv";

// Data
import { append }   from "./data/append";
import { rand }     from "./data/rand";
import { randMat }  from "./data/rand-mat";
import { numInds }  from "./data/num-inds";
import { intVec }   from "./data/int-vec";
import { row2mat }  from "./data/row2mat";
import { col2mat }  from "./data/col2mat";
import { linspace } from "./data/linspace";
import { arange }   from "./data/arange";
import { logspace } from "./data/logspace";
import { sort }     from "./data/sort";
import { unique }   from "./data/unique";
import { any }      from "./data/any";
import { all }      from "./data/all";
import { clip }         from "./data/clip";
import { argsort }      from "./data/argsort";
import { nonzero }      from "./data/nonzero";
import { meshgrid }     from "./data/meshgrid";
import { flatten }      from "./data/flatten";
import { roll }         from "./data/roll";
import { repeatElem }   from "./data/repeat-elem";
import { where }        from "./data/where";
import { countNonzero } from "./data/count-nonzero";
import { searchsorted } from "./data/searchsorted";

// Utility
import { real }        from "./utility/real";
import { imag }        from "./utility/imag";
import { rotate }      from "./utility/rotate";
import { parseDate }   from "./utility/parse-date";
import { isPosDef }    from "./utility/is-pos-def";
import { interpolate } from "./utility/interpolate";
import { ifElse }      from "./utility/if-else";
import { firstPos }    from "./utility/first-pos";
import { erf }         from "./utility/erf";
import { erfc }        from "./utility/erfc";
import { gamma }       from "./utility/gamma";
import { lgamma }      from "./utility/lgamma";
import { normcdf }     from "./utility/normcdf";
import { norminv }     from "./utility/norminv";
import { sinc }        from "./utility/sinc";
import { spline }      from "./utility/spline";

export const BUILTIN_FUNCTIONS: Map<string, BuiltinFn> = new Map([
  // Trig
  ["sin",   sin],   ["cos",   cos],   ["tan",   tan],
  ["asin",  asin],  ["acos",  acos],  ["atan",  atan],  ["atan2", atan2],
  ["sinh",  sinh],  ["cosh",  cosh],  ["tanh",  tanh],
  ["asinh", asinh], ["acosh", acosh], ["atanh", atanh],
  ["sec",   sec],   ["csc",   csc],   ["cot",   cot],
  ["asec",  asec],  ["acsc",  acsc],  ["acot",  acot],
  ["asech", asech], ["acsch", acsch], ["acoth", acoth],
  // Log / power
  ["ln",    ln],    ["log10", log10], ["log2",  log2],  ["log",   log],
  ["root",  root],  ["power", power],
  // Basic
  ["abs",    abs],   ["floor",  floor],  ["ceil",   ceil],
  ["round",  round], ["max",    max],    ["min",    min],
  ["maxu",   maxu],  ["minu",   minu],   ["maxind", maxInd],
  ["minind", minInd],["sign",   sign],
  ["deg2rad", deg2rad], ["rad2deg", rad2deg],
  ["exp",      exp],      ["sqrt",     sqrt],     ["trunc",    trunc],
  ["mod",      mod],      ["hypot",    hypot],
  ["isnan",    isnan],    ["isinf",    isinf],
  ["factorial", factorial], ["nchoosek", nchoosek],
  ["gcd",      gcd],      ["lcm",      lcm],
  ["cbrt",     cbrt],     ["log1p",    log1p],    ["expm1",    expm1],
  // Stats
  ["mean",       mean],       ["sum",        sum],        ["median",     median],
  ["mode",       mode],       ["range",      range],      ["stdev",      stdev],
  ["variance",   variance],   ["cv",         cv],
  ["percentile", percentile], ["quantile",   quantile],
  ["cumsum",     cumsum],     ["diff",       diff],
  ["skewness",   skewness],   ["kurtosis",   kurtosis],
  ["corr",       corr],       ["cov",        cov],
  ["prod",       prod],       ["cumprod",    cumprod],    ["cummax",     cummax],    ["cummin",     cummin],
  // Fitting
  ["polyfit",   polyfit], ["powerfit", powerfit], ["logfit",   logfit],
  ["expfit",    expfit],  ["histogram",histogram],
  // Matrix
  ["transpose",     transpose],   ["size",          size],
  ["creatematrix",  createMatrix], ["create-matrix", createMatrix], ["identity", identity],
  ["norm",          norm],         ["csnorm",        csNorm],
  ["rsnorm",        rsNorm],       ["trace",         trace],
  ["conj",          conj],         ["dotmult",       dotMult],
  ["dotdiv",        dotDiv],       ["dot",           dot],
  ["cross",         cross],        ["threshold",     threshold],
  ["iscolumn",      isColumn],     ["isrow",         isRow],
  ["ismatrix",      isMatrix],     ["numel",         numEl],    ["num-el", numEl],
  ["length",        length],       ["fliplr",        fliplr],
  ["flipud",        flipud],       ["diag",          diag],
  ["zeros",         zeros],        ["ones",          ones],        ["full", full],
  ["reshape",       reshape],      ["repmat",        repmat],
  ["triu",          triu],         ["tril",          tril],
  ["matur",         matur],        ["matll",         matll],
  ["kron",          kron],
  // Linear algebra
  ["cholesky",  cholesky], ["ludecomp",  luDecomp], ["inverselu", inverseLu],
  ["gausse",    gaussE],   ["squash",    squash],   ["det",       det],
  ["matpow",    matPow],   ["solve",     solve],    ["eig",       eig],
  ["svd",       svd],
  ["pinv",      pinv],    ["lstsq",     lstsq],    ["rank",      rank],    ["expm",       expm],
  ["qr",        qr],      ["cond",      cond],
  ["null-space", nullSpace], ["nullspace", nullSpace],
  ["orth",      orth],
  // Probability
  ["tcdf",      tcdf],    ["tinv",      tinv],
  ["chi2cdf",   chi2cdf], ["chi2inv",   chi2inv],
  ["fcdf",      fcdf],    ["finv",      finv],
  ["binocdf",   binocdf], ["binopdf",   binopdf],
  ["poisscdf",  poisscdf],
  ["expcdf",    expcdf],  ["randn",     randn],
  // Calculus
  ["integrate",    integrate], ["derivative", derivative], ["derivativeun", derivativeUn],
  ["trapz",        trapz],     ["cumtrapz",   cumtrapz],   ["gradient",     gradient],
  ["newtoncotes",  newtonCotes], ["newton-cotes", newtonCotes],
  // Numerical
  ["incsearch", incSearch], ["bisect", bisect], ["falsepos", falsePos],
  ["secant",    secant],    ["ode4",   ode4],
  // Signal
  ["fft", fft], ["fourier", fourier], ["conv", conv],
  // Data
  ["append",   append],   ["rand",     rand],    ["randmat",  randMat],   ["rand-mat", randMat],
  ["numinds",  numInds],  ["num-inds", numInds],  ["intvec",   intVec],  ["row2mat",  row2mat],
  ["col2mat",  col2mat],  ["linspace", linspace],  ["arange", arange],  ["logspace", logspace],
  ["sort",     sort],     ["unique",   unique],  ["any",      any],
  ["all",      all],
  ["clip",     clip],     ["argsort",  argsort], ["nonzero",  nonzero],
  ["meshgrid", meshgrid], ["flatten",  flatten],
  ["roll",           roll],                       ["repeat",        repeatElem],
  ["where",          where],
  ["count-nonzero",  countNonzero], ["countnonzero",  countNonzero],
  ["searchsorted",   searchsorted],
  // Utility
  ["real",        real],      ["imag",        imag],      ["rotate",      rotate],
  ["parsedate",   parseDate], ["isposdef",    isPosDef],  ["interpolate", interpolate],
  ["ifelse",      ifElse],    ["firstpos",    firstPos],  ["first-pos",   firstPos],  ["erf", erf],
  ["erfc",        erfc],      ["gamma",       gamma],     ["lgamma",      lgamma],
  ["normcdf",     normcdf],   ["norminv",     norminv],   ["sinc",        sinc],
  ["spline",      spline],
]);
