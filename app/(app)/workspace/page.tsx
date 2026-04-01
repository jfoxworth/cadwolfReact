import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/utils/getSessionUser";
import { db } from "@/utils/db";

export default async function WorkspaceIndexPage() {
  const { userId } = await getSessionUser();

  const ws = await db.file.findFirst({
    where: { userId, parentId: null, deletedAt: null, fileTypeId: "Workspace" },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!ws) notFound();

  redirect(`/workspace/${ws.id}`);
}
