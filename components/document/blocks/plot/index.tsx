"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Block } from "@/types/document";
import type { SolveResult } from "@/solver/types";
import type { PlotDefinition } from "./types";
import PlotEditModal from "./edit";
import LineView from "./line/view";
import AreaView from "./area/view";
import PieView from "./pie/view";
import DonutView from "./donut/view";
import HeatmapView from "./heatmap/view";
import BubbleView from "./bubble/view";
import ScatterView from "./scatter/view";
import BarView from "./bar/view";
import ComboView from "./combo/view";
import SurfaceView from "./surface/view";

// ─── Main component ───────────────────────────────────────────────────────────

interface PlotBlockProps {
  block: Block;
  solverResults?: Map<string, SolveResult>;
  canEdit?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string | null) => void;
  onDefinitionChange?: (blockId: string, newDef: Record<string, unknown>) => void;
}

export default function PlotBlock({
  block,
  solverResults,
  canEdit = false,
  isSelected = false,
  onSelect,
  onDefinitionChange,
}: PlotBlockProps) {
  const def = block.definition as PlotDefinition;
  const [editing, setEditing] = useState(false);

  useEffect(() => { if (!isSelected) setEditing(false); }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Increment revision whenever solverResults reference changes so react-plotly.js
  // always re-draws the chart (it uses reference equality on data/layout props).
  const revisionRef = useRef(0);
  const prevResultsRef = useRef(solverResults);
  if (prevResultsRef.current !== solverResults) {
    revisionRef.current += 1;
    prevResultsRef.current = solverResults;
  }
  const revision = revisionRef.current;

  const varNames = solverResults
    ? [...new Set([...solverResults.values()].filter((r) => r?.variableName).map((r) => r!.variableName))]
    : [];

  const handleSave = useCallback(
    (newDef: PlotDefinition) => {
      setEditing(false);
      onDefinitionChange?.(block.id, newDef as unknown as Record<string, unknown>);
    },
    [block.id, onDefinitionChange],
  );

  const plotType = def.plotType ?? "line";
  const height   = def.height ?? 400;
  const knownTypes = ["line", "area", "scatter", "bar", "combo", "pie", "donut", "heatmap", "surface", "bubble"];

  return (
    <>
      {editing && (
        <PlotEditModal
          initial={def}
          varNames={varNames}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}

      <div
        onClick={() => onSelect?.(block.id)}
        onDoubleClick={() => { if (canEdit) setEditing(true); }}
        className={[
          "rounded-lg overflow-hidden",
          isSelected ? "ring-2 ring-blue-400" : "",
          canEdit ? "cursor-pointer" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {plotType === "line"    && <LineView    def={def} solverResults={solverResults} revision={revision} />}
        {plotType === "area"    && <AreaView    def={def} solverResults={solverResults} revision={revision} />}
        {plotType === "pie"     && <PieView     def={def} solverResults={solverResults} revision={revision} />}
        {plotType === "donut"   && <DonutView   def={def} solverResults={solverResults} revision={revision} />}
        {plotType === "heatmap" && <HeatmapView def={def} solverResults={solverResults} revision={revision} />}
        {plotType === "scatter" && <ScatterView def={def} solverResults={solverResults} revision={revision} />}
        {plotType === "bar"     && <BarView     def={def} solverResults={solverResults} revision={revision} />}
        {plotType === "combo"   && <ComboView   def={def} solverResults={solverResults} revision={revision} />}
        {plotType === "surface" && <SurfaceView def={def} solverResults={solverResults} revision={revision} />}
        {plotType === "bubble"  && <BubbleView  def={def} solverResults={solverResults} revision={revision} />}

        {!knownTypes.includes(plotType) && (
          <div
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400"
            style={{ height }}
          >
            <span>Plot — double-click to configure</span>
          </div>
        )}
      </div>
    </>
  );
}
