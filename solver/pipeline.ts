import type { SolveContext } from "./types";

import { getVariables }            from "./steps/01-get-variables";
import { checkString }             from "./steps/02-check-string";
import { recombineUnits }          from "./steps/03-recombine-units";
import { parseInputs }             from "./steps/04-parse-inputs";
import { replaceInputs }           from "./steps/05-replace-inputs";
import { flagBuiltinEquations }    from "./steps/06-flag-builtin-equations";
import { removeBuiltinEquations }  from "./steps/07-remove-builtin-equations";
import { removeSubEquations }      from "./steps/08-remove-sub-equations";
import { removeFilesAsFunctions }  from "./steps/09-remove-files-as-functions";
import { replaceVariables }        from "./steps/10-replace-variables";
import { replaceCad }              from "./steps/11-replace-cad";
import { replaceConstants }        from "./steps/12-replace-constants";
import { replaceMatrixPieces }     from "./steps/13-replace-matrix-pieces";
import { replaceVectors }          from "./steps/14-replace-vectors";
import { replaceMatrices }         from "./steps/15-replace-matrices";
import { replaceNumbers }          from "./steps/16-replace-numbers";
import { replaceTables }           from "./steps/17-replace-tables";
import { checkImaginary }          from "./steps/18-check-imaginary";
import { checkNegatives }          from "./steps/19-check-negatives";
import { checkEquation }           from "./steps/20-check-equation";
import { unitArray }               from "./steps/21-unit-array";
import { scaleUnits }              from "./steps/22-scale-units";
import { decomposeUnits }          from "./steps/23-decompose-units";
import { getBaseString }           from "./steps/24-get-base-string";
import { convertToPost }           from "./steps/25-convert-to-post";
import { solvePostfix }            from "./steps/26-solve-postfix";
import { recomposeUnits }          from "./steps/27-recompose-units";
import { formatFractions }         from "./steps/28-format-fractions";
import { matrixSubcomp }           from "./steps/29-matrix-subcomp";
import { getMyBaseString }         from "./steps/30-get-my-base-string";
import { showEquation }            from "./steps/31-show-equation";
import { getSize }                 from "./steps/32-get-size";
import { showSolution }            from "./steps/33-show-solution";
import { models }                  from "./steps/34-models";
import { equationCleanup }         from "./steps/35-equation-cleanup";
import { returnEquation }          from "./steps/36-return-equation";

const STEPS = [
  getVariables,
  checkString,
  recombineUnits,
  parseInputs,
  replaceInputs,
  flagBuiltinEquations,
  removeBuiltinEquations,
  removeSubEquations,
  removeFilesAsFunctions,
  replaceVariables,
  replaceCad,
  replaceConstants,
  replaceMatrixPieces,
  replaceVectors,
  replaceMatrices,
  replaceNumbers,
  replaceTables,
  checkImaginary,
  checkNegatives,
  checkEquation,
  unitArray,
  scaleUnits,
  decomposeUnits,
  getBaseString,
  convertToPost,
  solvePostfix,
  recomposeUnits,
  formatFractions,
  matrixSubcomp,
  getMyBaseString,
  showEquation,
  getSize,
  showSolution,
  models,
  equationCleanup,
  returnEquation,
] as const;

function isFatalError(errors: string[]): boolean {
  // Currently all errors are treated as fatal and stop the pipeline.
  // This can be refined to distinguish parse vs. runtime errors.
  return errors.length > 0;
}

export async function runPipeline(ctx: SolveContext): Promise<SolveContext> {
  for (const step of STEPS) {
    ctx = await step(ctx);
    if (isFatalError(ctx.errors)) break;
  }
  return ctx;
}
