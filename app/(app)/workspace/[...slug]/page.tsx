import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/utils/getSessionUser";
import { resolveFileRoute, TYPE_ROUTE } from "@/utils/resolveRoute";
import { db } from "@/utils/db";
import { fileToItem } from "@/utils/transformers";
import WorkspaceWrapper from "@/components/workspace/workspaceWrapper";
import { checkPermission } from "@/utils/checkPermission";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const { userId } = await getSessionUser();

  const resolved = await resolveFileRoute("workspace", slug, userId);
  if (!resolved) notFound();

  // Redirect if the slug belongs to a non-workspace type
  const correctRoute = TYPE_ROUTE[resolved.fileTypeId];
  if (correctRoute && correctRoute !== "workspace") {
    redirect(`/${correctRoute}/${slug[0]}`);
  }

  const [file, children, canView, canEdit, canAdmin] = await Promise.all([
    db.file.findUniqueOrThrow({ where: { id: resolved.id } }),
    db.file.findMany({
      where: { parentId: resolved.id, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    checkPermission(resolved.id, userId, "view"),
    checkPermission(resolved.id, userId, "edit"),
    checkPermission(resolved.id, userId, "admin"),
  ]);

  if (!canView) notFound();

  return (
    <WorkspaceWrapper
      data={{ workspace: fileToItem(file), items: children.map(fileToItem) }}
      canEdit={canEdit}
      canAdmin={canAdmin}
      userId={userId}
    />
  );
}
