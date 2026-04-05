import type { File, Component, Dataset, Datapoint } from "@prisma/client";
import type { Item, ItemType, SolverLocation, ItemPermission, TocSettings, FunctionSettings, FunctionPort, ImportedFunction } from "@/types/item";
import type { Block, BlockType } from "@/types/document";
import type { Dataset as DatasetType, DatasetParser } from "@/types/dataset";

// ─── File → Item ─────────────────────────────────────────────────────────────

// Laravel stores file_type_id as a capitalised string e.g. "Workspace".
// Our ItemType enum uses uppercase e.g. "WORKSPACE".
const FILE_TYPE_MAP: Record<string, ItemType> = {
  Workspace:   "WORKSPACE",
  Document:    "DOCUMENT",
  Folder:      "FOLDER",
  PartTree:    "PART_TREE",
  "Part Tree": "PART_TREE",
  Dataset:     "DATASET",
};

export function fileToItem(f: File): Item {
  let itemData: Record<string, unknown> = {};
  try { itemData = JSON.parse(f.itemData ?? "{}"); } catch { /* ignore */ }
  return {
    id:          String(f.id),
    slug:        f.slug,
    type:        FILE_TYPE_MAP[f.fileTypeId] ?? (f.fileTypeId.toUpperCase() as ItemType),
    name:        f.name,
    parentId:    f.parentId ? String(f.parentId) : null,
    ownerId:     String(f.userId),
    order:       f.order,
    version:     f.version,
    description: typeof itemData.description === "string" ? itemData.description : undefined,
    width:       typeof itemData.width === "number" ? itemData.width : undefined,
    solver:      ["browser","python","server"].includes(itemData.solver as string)
                   ? (itemData.solver as SolverLocation) : undefined,
    permissions: Array.isArray(itemData.permissions)
                   ? (itemData.permissions as ItemPermission[]) : undefined,
    toc: itemData.toc && typeof itemData.toc === "object"
           ? (itemData.toc as TocSettings) : undefined,
    functionSettings: (() => {
      if (itemData.functionSettings && typeof itemData.functionSettings === "object") {
        return itemData.functionSettings as FunctionSettings;
      }
      // Legacy format: fileAsFunction.inputs[].name / .units
      const faf = itemData.fileAsFunction as Record<string, unknown> | undefined;
      if (faf && typeof faf === "object") {
        const mapPorts = (arr: unknown): FunctionSettings["inputs"] =>
          Array.isArray(arr)
            ? arr.map((p: Record<string, unknown>) => ({
                variableName: String(p.name ?? ""),
                unit:         String(p.units ?? ""),
                description:  "",
              }))
            : [];
        return { inputs: mapPorts(faf.inputs), outputs: mapPorts(faf.outputs) };
      }
      return undefined;
    })(),
    importedFunctions: (() => {
      if (Array.isArray(itemData.importedFunctions)) {
        return itemData.importedFunctions as ImportedFunction[];
      }
      // Legacy format: impFunctions[].fileID / .fileName / .functionName / .functionInputs / .functionOutputs
      if (Array.isArray(itemData.impFunctions) && (itemData.impFunctions as unknown[]).length > 0) {
        const mapPorts = (arr: unknown): FunctionPort[] =>
          Array.isArray(arr)
            ? arr.map((p: Record<string, unknown>) => ({
                variableName: String(p.name ?? ""),
                unit:         String(p.units ?? ""),
                description:  "",
              }))
            : [];
        return (itemData.impFunctions as Record<string, unknown>[]).map((fn) => ({
          sourceFileId:   Number(fn.fileID ?? 0),
          sourceFileName: String(fn.fileName ?? ""),
          localAlias:     String(fn.functionName ?? ""),
          inputs:         mapPorts(fn.functionInputs),
          outputs:        mapPorts(fn.functionOutputs),
        }));
      }
      return undefined;
    })(),
    quantity: typeof itemData.systemCount === "number" ? itemData.systemCount
            : typeof itemData.quantity === "number" ? itemData.quantity : undefined,
    needsUpdate: f.needsUpdate,
    importedCad: Array.isArray(itemData.importedCAD)
      ? (itemData.importedCAD as Array<Record<string, unknown>>)
          .map((entry) => {
            // New computed format (written by refresh-cad-properties endpoint)
            if (entry._computed) {
              return {
                eqname:   String(entry.eqname ?? ""),
                partName: entry.partName as string | undefined,
                properties: entry.properties as Record<string, number> | undefined,
              };
            }

            // Legacy Laravel format
            const partData  = entry.part_data as Record<string, unknown> | undefined;
            const massData  = entry.mass_data as Record<string, unknown> | undefined;
            const bodies    = massData?.bodies as Record<string, Record<string, unknown>> | undefined;
            const partId    = partData?.partId as string | undefined;
            const body      = partId && bodies ? bodies[partId] : undefined;

            let properties: Record<string, number> | undefined;
            if (body) {
              const num = (arr: unknown, idx = 1) =>
                Array.isArray(arr) ? (arr[idx] as number) : typeof arr === "number" ? arr : NaN;
              const mass   = num(body.mass);
              const volume = num(body.volume);
              properties = {
                mass,
                volume,
                surface:  num(body.periphery),
                weight:   typeof body.weight_N === "number" ? body.weight_N : mass * 9.80665,
                density:  volume > 0 ? mass / volume : NaN,
              };
            }

            return {
              eqname:     String(entry.eqname ?? ""),
              partName:   partData ? String(partData.name ?? "") : undefined,
              properties,
            };
          })
          .filter((e) => e.eqname)
      : undefined,
    importedCadFetchedAt: typeof itemData.importedCadFetchedAt === "string"
      ? itemData.importedCadFetchedAt
      : undefined,
    fileImage: (() => {
      const raw = (typeof itemData.fileImage === "string" && itemData.fileImage)
        ? itemData.fileImage
        : (typeof itemData.imageSource === "string" && itemData.imageSource)
          ? itemData.imageSource
          : null;
      if (!raw) return undefined;
      return raw.startsWith("http") ? raw : `https://cadwolf.s3.amazonaws.com/${raw}`;
    })(),
    lockedBy:    f.lockedBy ?? null,
    lockedAt:    f.lockedAt?.toISOString() ?? null,
    createdAt:   f.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt:   f.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// ─── Component → Block ───────────────────────────────────────────────────────

const COMPONENT_TYPE_MAP: Record<number, BlockType> = {
  1:  "TEXT",
  2:  "HEADER",
  3:  "EQUATION",
  4:  "SYMBOLIC_EQUATION",
  6:  "FOR_LOOP",
  7:  "WHILE_LOOP",
  8:  "IF_ELSE",
  9:  "PLOT",
  10: "IMAGE",
  11: "VIDEO",
  12: "LINE_BREAK",
  13: "CARD",
  14: "SLIDER",
  15: "DROPDOWN",
  16: "SELECT_BLOCK",
};

export const BLOCK_TYPE_TO_COMPONENT_ID: Record<BlockType, number> = {
  TEXT:              1,
  HEADER:            2,
  EQUATION:          3,
  SYMBOLIC_EQUATION: 4,
  FOR_LOOP:          6,
  WHILE_LOOP:        7,
  IF_ELSE:           8,
  PLOT:              9,
  IMAGE:             10,
  VIDEO:             11,
  LINE_BREAK:        12,
  SLIDER:            14,
  DROPDOWN:          15,
  SELECT_BLOCK:      16,
  CARD:              13,
};

export function componentToBlock(c: Component): Block {
  let raw: Record<string, unknown> = {};
  try { raw = JSON.parse(c.content ?? "{}"); } catch { /* ignore */ }

  const type = COMPONENT_TYPE_MAP[c.componentTypeId] ?? "TEXT";

  // New-format blocks store definition directly with a _v2 marker
  if (raw._v2 === true) {
    const { _v2: _, solution, ...definition } = raw;
    // Fix old broken part-tree saves where solution.display was stored as a DisplayState
    // object instead of a pre-built LaTeX string.
    let fixedSolution = solution as Record<string, unknown> | undefined;
    if (fixedSolution && typeof fixedSolution.display === "object" && fixedSolution.display !== null) {
      const d = fixedSolution.display as { equation?: string; solution?: string };
      const lhs = d.equation ?? "";
      const rhs = d.solution ?? "";
      fixedSolution = { ...fixedSolution, display: rhs ? `${lhs} = ${rhs}` : lhs };
    }
    return { id: String(c.id), refId: String(c.id), type, order: c.order, name: c.name ?? undefined, definition, solution: fixedSolution };
  }

  let definition: Record<string, unknown>;

  if (type === "EQUATION") {
    // Old format: { Equation: { newEquation: "a=4", ... }, Name: "a" }
    const eq = raw.Equation as Record<string, unknown> | undefined;
    definition = {
      raw: (eq?.newEquation as string | undefined) ?? "",
    };
  } else if (type === "SYMBOLIC_EQUATION") {
    // Old format: { text: "F=m \\cdot a", ... }
    // Block reads definition.expression (LaTeX string)
    definition = {
      expression: (raw.text as string | undefined) ?? "",
    };
  } else if (type === "HEADER") {
    // Old format: { text: "My heading", hClass: "header2" }
    const hClass = (raw.hClass as string | undefined) ?? "header2";
    const levelMatch = hClass.match(/\d+/);
    definition = {
      text:  (raw.text as string | undefined) ?? "",
      level: levelMatch ? Number(levelMatch[0]) : 2,
    };
  } else if (type === "TEXT") {
    // Old format: { text: "<p>...</p>" }
    definition = { text: (raw.text as string | undefined) ?? "" };
  } else if (type === "IMAGE") {
    // Old format: { src: "path/or/url", isCAD: bool, width: ..., height: ... }
    // Non-CAD images use a relative S3 path; CAD images store the full URL.
    const rawSrc = (raw.src as string | undefined) ?? "";
    const isCAD  = Boolean(raw.isCAD);
    const src    = rawSrc
      ? isCAD
        ? rawSrc
        : `https://cadwolf.s3.amazonaws.com/${rawSrc}`
      : "";
    definition = {
      src,
      alt:     (raw.alt as string | undefined) ?? (c.name ?? ""),
      caption: (raw.caption as string | undefined) ?? "",
      width:   raw.width,
      height:  raw.height,
    };
  } else if (type === "PLOT") {
    // Old format: { Plot: { Title_text, Chart_dataobj: [...], Chart_xaxesobj, Chart_yaxesobj } }
    const plotObj = raw.Plot as Record<string, unknown> | undefined;
    if (plotObj) {
      const chartDataObj = (plotObj.Chart_dataobj as Record<string, unknown>[]) ?? [];
      const xaxes = (plotObj.Chart_xaxesobj as Record<string, unknown>[]) ?? [];
      const yaxes = (plotObj.Chart_yaxesobj as Record<string, unknown>[]) ?? [];

      const series = chartDataObj.map((d) => {
        // PointData: { "0": { x: 0, y: 54 }, "1": { x: 1, y: 55 }, ... }
        const pointData = (d.PointData ?? {}) as Record<string, Record<string, number>>;
        const indices = Object.keys(pointData).map(Number).sort((a, b) => a - b);
        const xValues = indices.map((k) => pointData[String(k)]?.x ?? k);
        const yValues = indices.map((k) => pointData[String(k)]?.y ?? 0);

        const chartType = (d.Format_type as string) || (plotObj.Chart_type as string) || "line";
        const mode = chartType === "line" ? "lines" : chartType === "scatter" ? "markers" : "lines";

        return {
          x: (d.xdata_name as string) || "",
          y: (d.ydata_name as string) || "",
          label: (d.dataname as string) || (d.ydata_name as string) || "",
          color: (d.color as string) || "#2563eb",
          lineWidth: Number(d.lineWidth ?? 2),
          markerSize: 6,
          mode,
          xValues,
          yValues,
        };
      });

      const rawChartType = ((plotObj.Chart_type as string) ?? "line").toLowerCase();
      const plotType =
        rawChartType === "pie"                                    ? "pie"     :
        rawChartType === "donut"                                  ? "donut"   :
        rawChartType === "area"                                   ? "area"    :
        ["heatmap", "heat_map", "heatmap"].includes(rawChartType) ? "heatmap" : "line";

      if (plotType === "heatmap") {
        // Old heatmap data: zVar is typically stored as ydata_name on the first series entry
        const first = chartDataObj[0] as Record<string, unknown> | undefined;
        definition = {
          plotType,
          title: (plotObj.Title_text as string) || "",
          xLabel: (xaxes[0]?.Axis_label as string) || "",
          yLabel: (yaxes[0]?.Axis_label as string) || "",
          height: 400,
          hmZVar: (first?.ydata_name as string) || "",
          colorscale: "Viridis",
          showNumbers: false,
        };
      } else if (plotType === "pie" || plotType === "donut") {
        const first = chartDataObj[0] as Record<string, unknown> | undefined;
        definition = {
          plotType,
          title: (plotObj.Title_text as string) || "",
          height: 400,
          valuesVar: (first?.ydata_name as string) || "",
          storedValues: first
            ? (() => {
                const pd = (first.PointData ?? {}) as Record<string, Record<string, number>>;
                return Object.keys(pd).map(Number).sort((a, b) => a - b).map((k) => pd[String(k)]?.y ?? 0);
              })()
            : [],
          showLegend: true,
          textInfo: "percent",
        };
      } else {
        definition = {
          plotType,
          title: (plotObj.Title_text as string) || "",
          xLabel: (xaxes[0]?.Axis_label as string) || "",
          yLabel: (yaxes[0]?.Axis_label as string) || "",
          height: 400,
          series,
        };
      }
    } else {
      definition = raw;
    }
  } else {
    definition = raw;
  }

  return {
    id:     String(c.id),
    refId:  String(c.id),
    type,
    order:  c.order,
    name:   c.name ?? undefined,
    definition,
  };
}

// ─── Dataset + Datapoints → Dataset ──────────────────────────────────────────
//
// The old system stores each value as a separate Datapoint row.
// We reconstruct rawText by joining content values in order,
// and provide a single newline parser so the table renders correctly.

export function dbDatasetToDataset(
  d: Dataset,
  datapoints: Datapoint[],
): DatasetType {
  const sorted = [...datapoints].sort((a, b) => a.order - b.order);
  const rawText = sorted.map((dp) => dp.content).join("\n");

  const parsers: DatasetParser[] = rawText.trim()
    ? [{ id: "p1", label: "Row", separator: "\\n" }]
    : [];

  return {
    id:          String(d.id),
    type:        "DATASET",
    name:        d.name,
    description: d.description ?? undefined,
    parentId:    d.parentId ? String(d.parentId) : null,
    ownerId:     String(d.userId),
    parsers,
    rawText,
    createdAt:   d.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt:   d.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}
