import { notFound, redirect } from "next/navigation";
import { getSessionUserOrNull } from "@/utils/getSessionUser";
import { db } from "@/utils/db";
import { checkPermission } from "@/utils/checkPermission";
import DatasetWrapper from "@/components/dataset/DatasetWrapper";
import type { Dataset, DatasetParser } from "@/types/dataset";
import type { File } from "@prisma/client";

const NANOID_RE = /^[A-Za-z0-9_-]{10}$/;

function fileToDataset(file: File): Dataset {
  let itemData: Record<string, unknown> = {};
  try { itemData = JSON.parse(file.itemData ?? "{}"); } catch { /* ignore */ }

  // Build rawText from the `real` object (row-col keyed values) stored in item_data
  const real = itemData.real as Record<string, string> | undefined;
  const sizeStr = (itemData.size as string | undefined) ?? "0x0";
  const [rowsStr, colsStr] = sizeStr.split("x");
  const rows = parseInt(rowsStr, 10) || 0;
  const cols = parseInt(colsStr, 10) || 0;

  let rawText = "";
  if (real && rows > 0 && cols > 0) {
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      const cells: string[] = [];
      for (let c = 0; c < cols; c++) {
        const val = real[`${r}-${c}`] ?? "";
        // Strip leading \n or \t separators stored as prefixes in the old system
        cells.push(val.replace(/^[\n\t]/, ""));
      }
      lines.push(cells.join("\t"));
    }
    rawText = lines.join("\n");
  } else if (typeof itemData.inputString === "string" && itemData.inputString) {
    rawText = itemData.inputString;
  }

  // Build parsers from stored separator array
  const rawParsers = itemData.parsers as string[] | undefined;
  const parsers: DatasetParser[] = (rawParsers ?? []).map((sep, i) => ({
    id: `p${i}`,
    label: sep === "\n" || sep === "\\n" ? "Row" : "Column",
    separator: sep,
  }));

  const description = typeof itemData.description === "string" ? itemData.description : undefined;

  return {
    id: String(file.id),
    type: "DATASET",
    name: file.name,
    description,
    parentId: file.parentId ? String(file.parentId) : null,
    ownerId: String(file.userId),
    parsers,
    rawText,
    createdAt: file.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: file.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const session = await getSessionUserOrNull();
  const userId = session?.userId ?? 0;
  const single = slug.length === 1 ? slug[0] : null;

  let fileId: number | null = null;

  if (single && /^\d+$/.test(single)) {
    fileId = Number(single);
  } else if (single && NANOID_RE.test(single)) {
    const f = await db.file.findUnique({ where: { slug: single }, select: { id: true } });
    if (!f) notFound();
    fileId = f.id;
  } else {
    const segment = slug[slug.length - 1];
    const f = await db.file.findFirst({
      where: { name: { equals: segment, mode: "insensitive" }, userId, deletedAt: null, fileTypeId: "Dataset" },
      select: { id: true },
    });
    if (!f) notFound();
    fileId = f.id;
  }

  const [file, canView, canEdit] = await Promise.all([
    db.file.findUnique({ where: { id: fileId! } }),
    checkPermission(fileId!, userId, "view"),
    checkPermission(fileId!, userId, "edit"),
  ]);

  if (!file || !canView) {
    if (!userId) redirect("/login");
    notFound();
  }

  return (
    <DatasetWrapper
      data={{ dataset: fileToDataset(file) }}
      canEdit={canEdit}
    />
  );
}
