import { db } from "@/utils/db";

// Matches nanoid(10) output: URL-safe characters, exactly 10 chars
const NANOID_RE = /^[A-Za-z0-9_-]{10}$/;

const TYPE_ROUTE: Record<string, string> = {
  Workspace:   "workspace",
  Folder:      "workspace",
  Document:    "document",
  Dataset:     "dataset",
  PartTree:    "part-tree",
  "Part Tree": "part-tree",
};

export { TYPE_ROUTE };

export async function resolveFileRoute(
  routeType: "workspace" | "document" | "dataset" | "part-tree",
  segments: string[],
  userId: number,
): Promise<{ id: number; fileTypeId: string } | null> {
  const single = segments.length === 1 ? segments[0] : null;

  // 0. Single numeric segment → direct lookup by id (backwards compat + login fallback)
  if (single && /^\d+$/.test(single)) {
    const file = await db.file.findUnique({
      where: { id: Number(single) },
      select: { id: true, fileTypeId: true },
    });
    return file;
  }

  // 1. Single nanoid slug → direct lookup (caller redirects if type mismatches route)
  if (single && NANOID_RE.test(single)) {
    const file = await db.file.findUnique({
      where: { slug: single },
      select: { id: true, fileTypeId: true },
    });
    if (file) return file;
  }

  // 2. Single segment on workspace route → try username lookup (case-insensitive, spaces stripped)
  if (single && routeType === "workspace") {
    const normalized = single.toLowerCase().replace(/[\s_-]/g, "");
    const users = await db.user.findMany({
      where: { username: { not: null } },
      select: { id: true, username: true },
    });
    const matchedUser = users.find(
      (u) => u.username!.toLowerCase().replace(/[\s_-]/g, "") === normalized,
    );
    if (matchedUser) {
      const ws = await db.file.findFirst({
        where: { userId: matchedUser.id, parentId: null, deletedAt: null, fileTypeId: "Workspace" },
        orderBy: { id: "asc" },
        select: { id: true, fileTypeId: true },
      });
      return ws;
    }
  }

  // 3. Name path resolution — sequential, root scoped to logged-in userId
  let parentId: number | null = null;
  let file: { id: number; fileTypeId: string } | null = null;

  for (const segment of segments) {
    file = await db.file.findFirst({
      where: {
        name: { equals: segment, mode: "insensitive" },
        parentId,
        deletedAt: null,
        ...(parentId === null && userId ? { userId } : {}),
      },
      select: { id: true, fileTypeId: true },
    });
    if (!file) return null;
    parentId = file.id;
  }

  return file;
}
