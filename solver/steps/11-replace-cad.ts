import type { SolveContext, StepFn } from "../types";

// Onshape mass properties are always returned in SI units.
const PROPERTY_UNITS: Record<string, string> = {
  mass:             "kg",
  volume:           "m^3",
  surface:          "m^2",
  weight:           "N",
  density:          "kg/m^3",
  inertia:          "kg*m^2",
  principalInertia: "kg*m^2",
};

// Step 11: Replace_CAD (eqSolverOld.js lines 2032-2238)
// Replaces CAD part property references (e.g., "part.mass", "part.volume")
// with their numeric values and associated units.
//
// CAD references have the form: "partName.property" where property is one of:
//   mass, volume, surface, weight, inertia, principalInertia, centroid,
//   principalAxes, density
export const replaceCad: StepFn = async (ctx: SolveContext): Promise<SolveContext> => {
  if (!ctx.cadParts || Object.keys(ctx.cadParts).length === 0) return ctx;

  const tokens   = [...ctx.tokens];
  const keyArray = [...ctx.keyArray];
  const { cadParts } = ctx;

  // Iterate in reverse so splice offsets stay valid
  for (let index = tokens.length - 1; index >= 0; --index) {
    const nameArray = tokens[index].split(".");
    if (nameArray.length < 2) continue;

    const partName = nameArray[0];
    const property = nameArray[1];
    const part = cadParts[partName];
    if (!part) continue;

    const value = part.properties[property];
    if (value === undefined) continue;

    // Replace the token with the numeric value
    tokens[index] = value.toString();
    keyArray[index] = 0;

    // Splice unit token immediately after (same pattern as step 10)
    const unit = PROPERTY_UNITS[property];
    if (unit) {
      tokens.splice(index + 1, 0, unit);
      keyArray.splice(index + 1, 0, 1);
    }
  }

  return { ...ctx, tokens, keyArray };
};
