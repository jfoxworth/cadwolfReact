import PieEdit from "../pie/edit";
import type { PlotDefinition } from "../types";

interface Props {
  draft: PlotDefinition;
  varNames: string[];
  onChange: (patch: Partial<PlotDefinition>) => void;
}

// Donut edit is pie edit with the hole slider enabled.
export default function DonutEdit({ draft, varNames, onChange }: Props) {
  return <PieEdit draft={draft} varNames={varNames} onChange={onChange} showHole />;
}
