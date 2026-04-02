import { notFound, redirect } from "next/navigation";
import { getSessionUserOrNull } from "@/utils/getSessionUser";
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
  const session = await getSessionUserOrNull();
  const userId = session?.userId ?? 0;

  const resolved = await resolveFileRoute("workspace", slug, userId);
  if (!resolved) notFound();

  // Redirect if the slug belongs to a non-workspace type
  const correctRoute = TYPE_ROUTE[resolved.fileTypeId];
  if (correctRoute && correctRoute !== "workspace") {
    redirect(`/${correctRoute}/${slug[0]}`);
  }

  const [file, children, canView, canEdit, canAdmin, currentUser] = await Promise.all([
    db.file.findUniqueOrThrow({ where: { id: resolved.id } }),
    db.file.findMany({
      where: { parentId: resolved.id, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    checkPermission(resolved.id, userId, "view"),
    checkPermission(resolved.id, userId, "edit"),
    checkPermission(resolved.id, userId, "admin"),
    userId ? db.user.findUnique({ where: { id: userId }, select: { tier: true } }) : Promise.resolve(null),
  ]);

  if (!canView) {
    if (!userId) redirect("/login");
    notFound();
  }

  const canUpload = currentUser?.tier === "pro" || currentUser?.tier === "business";

  return (
    <WorkspaceWrapper
      data={{ workspace: fileToItem(file), items: children.map(fileToItem) }}
      canEdit={canEdit}
      canAdmin={canAdmin}
      userId={userId}
      canUpload={canUpload}
    />
  );
}
