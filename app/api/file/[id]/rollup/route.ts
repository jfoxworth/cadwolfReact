import { NextRequest, NextResponse } from "next/server";
import type { File } from "@prisma/client";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

async function fetchDescendantDocumentIds(rootId: number): Promise<{ id: number; name: string }[]> {
  const docs: { id: number; name: string }[] = [];
  let queue = [rootId];

  while (queue.length) {
    const children: File[] = await db.file.findMany({
      where: { parentId: { in: queue }, deletedAt: null },
    });
    const nextQueue: number[] = [];
    for (const child of children) {
      if (child.fileTypeId === "Document") {
        docs.push({ id: child.id, name: child.name });
      } else {
        nextQueue.push(child.id);
      }
    }
    queue = nextQueue;
  }

  return docs;
}

// GET /api/file/[id]/rollup?names=weight,area
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canView = await checkPermission(fileId, userId, "view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const namesParam = req.nextUrl.searchParams.get("names") ?? "";
  const requestedNames = namesParam
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);

  if (requestedNames.length === 0) {
    return NextResponse.json({ rows: [], totals: {} });
  }

  // Check if this file itself is a Document — if so, just query it directly
  const file = await db.file.findUnique({ where: { id: fileId }, select: { fileTypeId: true, name: true } });
  let docIds: { id: number; name: string }[] = [];

  if (file?.fileTypeId === "Document") {
    docIds = [{ id: fileId, name: file.name }];
  } else {
    docIds = await fetchDescendantDocumentIds(fileId);
  }

  if (docIds.length === 0) {
    return NextResponse.json({ rows: [], totals: {} });
  }

  // Fetch all components for these documents
  const components = await db.component.findMany({
    where: {
      fileId: { in: docIds.map((d) => d.id) },
      componentTypeId: { in: [3, 4] }, // EQUATION, SYMBOLIC_EQUATION
    },
    select: { id: true, fileId: true, name: true, content: true },
  });

  const docNameMap = Object.fromEntries(docIds.map((d) => [d.id, d.name]));

  interface Row {
    documentId: number;
    documentName: string;
    name: string;
    expression: string;
    value: number | null;
    unit: string;
  }

  const rows: Row[] = [];

  for (const comp of components) {
    const compName = (comp.name ?? "").toLowerCase();
    if (!requestedNames.includes(compName)) continue;

    let expression = "";
    let value: number | null = null;
    let unit = "";

    try {
      const raw = JSON.parse(comp.content ?? "{}") as Record<string, unknown>;
      // Old format: { Equation: { newEquation: "weight = 450", result: 450, units: "N" }, Name: "weight" }
      const eq = raw.Equation as Record<string, unknown> | undefined;
      expression = (eq?.newEquation as string | undefined) ?? "";
      unit = (eq?.units as string | undefined) ?? (raw.unit as string | undefined) ?? "";

      // Try to extract a stored result first
      if (typeof eq?.result === "number") {
        value = eq.result as number;
      } else {
        // Try to parse a simple assignment: name = <number>
        const match = expression.match(/=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*(?:\[.*\])?\s*$/);
        if (match) value = Number(match[1]);
        // Extract unit from bracket notation in expression e.g. "weight = 450 [N]"
        if (!unit) {
          const unitMatch = expression.match(/\[([^\]]+)\]/);
          if (unitMatch) unit = unitMatch[1];
        }
      }
    } catch { /* ignore parse errors */ }

    rows.push({
      documentId: comp.fileId,
      documentName: docNameMap[comp.fileId] ?? String(comp.fileId),
      name: comp.name ?? "",
      expression,
      value,
      unit,
    });
  }

  // Compute totals per equation name (sum of numeric values)
  const totals: Record<string, number> = {};
  for (const row of rows) {
    if (row.value !== null) {
      const key = row.name.toLowerCase();
      totals[key] = (totals[key] ?? 0) + row.value;
    }
  }

  return NextResponse.json({ rows, totals });
}
