import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { File } from "@prisma/client";
import { getSessionUserOrNull } from "@/utils/getSessionUser";
import { resolveFileRoute, TYPE_ROUTE } from "@/utils/resolveRoute";
import { db } from "@/utils/db";
import { fileToItem } from "@/utils/transformers";
import { checkPermission } from "@/utils/checkPermission";
import PartTreeWrapper from "@/components/part-tree/PartTreeWrapper";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveFileRoute("part-tree", slug, 0);
  if (!resolved) return {};
  const file = await db.file.findUnique({ where: { id: resolved.id }, select: { name: true } });
  return { title: file ? `Part Tree — ${file.name}` : "Part Tree" };
}

async function fetchDescendants(rootId: number): Promise<File[]> {
  const all: File[] = [];
  let queue = [rootId];
  while (queue.length) {
    const children = await db.file.findMany({
      where: { parentId: { in: queue }, deletedAt: null },
      orderBy: { order: "asc" },
    });
    all.push(...children);
    queue = children.map((c) => c.id);
  }
  return all;
}

export default async function PartTreePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const session = await getSessionUserOrNull();
  const userId = session?.userId ?? 0;

  const resolved = await resolveFileRoute("part-tree", slug, userId);
  if (!resolved) notFound();

  const correctRoute = TYPE_ROUTE[resolved.fileTypeId];
  if (correctRoute && correctRoute !== "part-tree") {
    redirect(`/${correctRoute}/${slug[0]}`);
  }

  const [file, descendants, canView, canEdit, canAdmin] = await Promise.all([
    db.file.findUniqueOrThrow({ where: { id: resolved.id } }),
    fetchDescendants(resolved.id),
    checkPermission(resolved.id, userId, "view"),
    checkPermission(resolved.id, userId, "edit"),
    checkPermission(resolved.id, userId, "admin"),
  ]);

  if (!canView) {
    if (!userId) redirect("/login");
    notFound();
  }


  return (
    <PartTreeWrapper
      data={{ partTree: fileToItem(file), items: descendants.map(fileToItem) }}
      canEdit={canEdit}
      canAdmin={canAdmin}
      userId={userId}
    />
  );
}
