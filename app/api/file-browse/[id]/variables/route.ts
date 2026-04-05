import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// componentTypeId values that define variables
const VARIABLE_TYPE_IDS = [3, 14, 15];

interface ParsedVariable {
  componentId:  number;
  variableName: string;
  displayRaw:   string;   // full equation string for display (e.g. "a = 4 N")
  value:        string | null;  // cached value to inject into destination document
  units:        string | null;
}

// GET /api/file-browse/[id]/variables
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();

  const canView = await checkPermission(Number(id), userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const components = await db.component.findMany({
    where: {
      fileId:          Number(id),
      componentTypeId: { in: VARIABLE_TYPE_IDS },
      inEdit:          1,
      deletedAt:       null,
    },
    orderBy: { order: "asc" },
    select:  { id: true, componentTypeId: true, content: true, name: true },
  });

  const variables: ParsedVariable[] = [];

  for (const c of components) {
    if (!c.content) continue;

    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(c.content) as Record<string, unknown>; }
    catch { continue; }

    let variableName = "";
    let displayRaw   = "";
    let value: string | null = null;
    let units: string | null = null;

    if (c.componentTypeId === 3) {
      // Old Laravel format: { Name: "a", Equation: { newEquation: "a = 4 N" } }
      const eq = parsed.Equation as Record<string, unknown> | undefined;
      const eqStr = (eq?.newEquation as string | undefined) ?? "";

      // Also handle new format: { raw: "a = 4 N" }
      const rawStr = (parsed.raw as string | undefined) ?? eqStr;

      // Extract variable name: text before first '='
      const eqMatch = rawStr.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/s);
      if (!eqMatch) continue;

      variableName = eqMatch[1].trim();
      displayRaw   = rawStr.trim();

      // Fall back to the Name field if regex didn't find a name
      if (!variableName && c.name) variableName = c.name;

      // Use the stored solved scalar. If not yet solved, value stays null
      // (import block will be excluded from the solver until a value exists).
      const sol = parsed.solution as { real?: Record<string, number>; units?: string } | undefined;
      const scalar = sol?.real?.["0-0"];
      if (scalar !== undefined) {
        value = String(scalar);
        units = sol?.units ?? null;
      }

    } else if (c.componentTypeId === 14) {
      // Slider: { variableName, value, unit }
      variableName  = (parsed.variableName as string) || (c.name ?? "");
      const v       = parsed.value ?? 0;
      const unit    = (parsed.unit as string | undefined) ?? "";
      units         = unit || null;
      // Include units in value so the synthetic equation "alias = 5 N" solves correctly
      value         = unit ? `${v} ${unit}` : String(v);
      displayRaw    = `${variableName} = ${v}${unit ? " " + unit : ""}`;

    } else if (c.componentTypeId === 15) {
      // Dropdown / SELECT_BLOCK: { variableName, options, selectedIndex }
      variableName  = (parsed.variableName as string) || (c.name ?? "");
      const options = (parsed.options as string[]) ?? [];
      const idx     = (parsed.selectedIndex as number) ?? 0;
      value         = options[idx] ?? "0";
      displayRaw    = `${variableName} = ${value}`;
    }

    if (!variableName) continue;

    variables.push({ componentId: c.id, variableName, displayRaw, value, units });
  }

  return NextResponse.json(variables);
}
