import PieView from "../pie/view";
import type { PlotDefinition } from "../types";
import type { SolveResult } from "@/solver/types";

interface Props {
  revision?: number;
  def: PlotDefinition;
  solverResults?: Map<string, SolveResult>;
}

// Donut is a pie with a hole — share the same view component.
export default function DonutView({ def, solverResults, revision }: Props) {
  return <PieView def={def} solverResults={solverResults} hole={def.hole ?? 0.4} revision={revision} />;
}
