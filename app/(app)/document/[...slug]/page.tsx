import { notFound, redirect } from "next/navigation";
import { getSessionUserOrNull } from "@/utils/getSessionUser";
import { resolveFileRoute, TYPE_ROUTE } from "@/utils/resolveRoute";
import { db } from "@/utils/db";
import { fileToItem, componentToBlock } from "@/utils/transformers";
import DocumentWrapper from "@/components/document/documentWrapper";
import { checkPermission } from "@/utils/checkPermission";

// Detect old-style imported components (those with inputFile pointing to a different file).
// Returns { regularComponents, legacyImports } where legacyImports is a list of
// { sourceFileId, sourceVariableName, value, order } parsed from the component JSON.
function splitLegacyImports(
  components: Awaited<ReturnType<typeof db.component.findMany>>,
  fileId: number,
) {
  const regularComponents: typeof components = [];
  const legacyImports: {
    sourceFileId: number;
    sourceVariableName: string;
    value: string | null;
    units: string | null;
    order: number;
  }[] = [];

  for (const c of components) {
    let raw: Record<string, unknown> = {};
    try { raw = JSON.parse(c.content ?? "{}"); } catch { /* ignore */ }

    // New-format blocks never have inputFile
    if (raw._v2 === true) { regularComponents.push(c); continue; }

    const inputFile = raw.inputFile;
    const sourceFileId = inputFile && inputFile !== "0" && inputFile !== 0
      ? Number(inputFile)
      : null;

    // It's an old-style import if inputFile points to a different file
    if (sourceFileId && sourceFileId !== fileId) {
      const name = (raw.Name as string | undefined) ?? "";
      const eq = raw.Equation as Record<string, unknown> | undefined;
      const newEq = (eq?.newEquation as string | undefined) ?? "";
      // Extract RHS from "VarName=value" or "VarName = value"
      const eqMatch = newEq.match(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*([\s\S]+)$/);
      const value = eqMatch ? eqMatch[1].trim() : null;
      const units = (eq?.Units_showunits as string | undefined) ?? null;

      legacyImports.push({
        sourceFileId,
        sourceVariableName: name,
        value,
        units: units || null,
        order: c.order,
      });
    } else {
      regularComponents.push(c);
    }
  }

  return { regularComponents, legacyImports };
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const session = await getSessionUserOrNull();
  const userId = session?.userId ?? 0;

  const resolved = await resolveFileRoute("document", slug, userId);
  if (!resolved) notFound();

  // Redirect if the slug belongs to a non-document type
  const correctRoute = TYPE_ROUTE[resolved.fileTypeId];
  if (correctRoute && correctRoute !== "document") {
    redirect(`/${correctRoute}/${slug[0]}`);
  }

  const LOCK_TIMEOUT_MS = 24 * 60 * 60 * 1000;

  const [file, allComponents, bibliographies, existingFileImports, datasetImports, canView, canEdit, currentUser] = await Promise.all([
    db.file.findUniqueOrThrow({ where: { id: resolved.id } }),
    db.component.findMany({
      where: { fileId: resolved.id, inEdit: 1, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    db.bibliography.findMany({
      where: { fileId: resolved.id },
      orderBy: { order: "asc" },
    }),
    db.fileImport.findMany({
      where:   { fileId: resolved.id },
      orderBy: { order: "asc" },
      include: { file: false },
    }),
    db.datasetImport.findMany({
      where: { fileId: resolved.id },
      orderBy: { order: "asc" },
    }),
    checkPermission(resolved.id, userId, "view"),
    checkPermission(resolved.id, userId, "edit"),
    userId ? db.user.findUnique({ where: { id: userId }, select: { tier: true } }) : Promise.resolve(null),
  ]);

  if (!canView) {
    if (!userId) redirect("/login");
    notFound();
  }

  // Split out old-style imported components (inputFile → different file)
  const { regularComponents, legacyImports } = splitLegacyImports(allComponents, resolved.id);

  // Migrate legacy imports to the file_imports table (upsert by fileId + sourceFileId + variable name)
  let migratedImports: typeof existingFileImports = [];
  if (legacyImports.length > 0) {
    // Fetch source file names in one query
    const sourceIds = [...new Set(legacyImports.map((li) => li.sourceFileId))];
    const sourceFiles = await db.file.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(sourceFiles.map((f) => [f.id, f.name]));

    // Build set of already-existing imports to avoid duplicates
    const existingKey = new Set(
      existingFileImports.map((ei) => `${ei.sourceFileId}:${ei.sourceVariableName}`)
    );

    const toCreate = legacyImports.filter(
      (li) => !existingKey.has(`${li.sourceFileId}:${li.sourceVariableName}`)
    );

    if (toCreate.length > 0) {
      const currentCount = await db.fileImport.count({ where: { fileId: resolved.id } });
      migratedImports = await db.$transaction(
        toCreate.map((li, idx) =>
          db.fileImport.create({
            data: {
              fileId:             resolved.id,
              sourceFileId:       li.sourceFileId,
              sourceFileName:     nameMap.get(li.sourceFileId) ?? "",
              sourceVariableName: li.sourceVariableName,
              localAlias:         li.sourceVariableName,
              value:              li.value,
              units:              li.units,
              needsUpdate:        false,
              order:              currentCount + idx,
            },
          })
        )
      );
    }
  }

  // Combine existing + newly migrated imports
  const allFileImports = [...existingFileImports, ...migratedImports];

  // Enrich imports with source file slugs
  const sourceIds = [...new Set(allFileImports.map((i) => i.sourceFileId))];
  const sourceFiles = sourceIds.length
    ? await db.file.findMany({ where: { id: { in: sourceIds } }, select: { id: true, slug: true } })
    : [];
  const slugMap = new Map(sourceFiles.map((f) => [f.id, f.slug]));

  const data = {
    document: fileToItem(file),
    blocks: regularComponents.map(componentToBlock),
    bibliographies: bibliographies.map((b) => ({
      id: b.id,
      authors: b.authors,
      title: b.title,
      year: b.year,
      source: b.source,
      url: b.url,
      doi: b.doi,
      note: b.note,
      order: b.order,
    })),
    fileImports: allFileImports.map((fi) => ({
      id: fi.id,
      sourceFileId: fi.sourceFileId,
      sourceFileName: fi.sourceFileName,
      sourceFileSlug: slugMap.get(fi.sourceFileId) ?? null,
      sourceVariableName: fi.sourceVariableName,
      localAlias: fi.localAlias,
      value: fi.value,
      units: fi.units,
      needsUpdate: fi.needsUpdate,
      order: fi.order,
    })),
    datasetImports: datasetImports.map((di) => ({
      id: di.id,
      datasetId: di.datasetId,
      datasetName: di.datasetName,
      localAlias: di.localAlias,
      cachedValues: di.cachedValues,
      datapointCount: di.datapointCount,
      matrixSize: di.matrixSize ?? null,
      needsUpdate: di.needsUpdate,
      order: di.order,
    })),
  };

  // Resolve lock info — auto-release stale locks
  let lockedBy: number | null = file.lockedBy;
  let lockedAt: Date | null = file.lockedAt;
  if (lockedBy !== null && lockedAt && Date.now() - lockedAt.getTime() > LOCK_TIMEOUT_MS) {
    // Stale lock — release it server-side so the page loads unlocked
    await db.file.update({ where: { id: resolved.id }, data: { lockedBy: null, lockedAt: null } });
    lockedBy = null;
    lockedAt = null;
  }

  let lockedByName: string | null = null;
  if (lockedBy !== null && lockedBy !== userId) {
    const locker = await db.user.findUnique({ where: { id: lockedBy }, select: { name: true } });
    lockedByName = locker?.name ?? "another user";
  }

  const lockInfo = {
    lockedBy,
    lockedAt: lockedAt?.toISOString() ?? null,
    lockedByName,
    isLockedByMe: !!userId && lockedBy === userId,
  };

  const canUpload = currentUser?.tier === "pro" || currentUser?.tier === "business";
  return <DocumentWrapper data={data} canEdit={canEdit} lockInfo={lockInfo} canUpload={canUpload} />;
}
