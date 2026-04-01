import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { resolveAncestors } from "@/utils/resolveAncestors";
import { getSessionUser } from "@/utils/getSessionUser";

const TYPE_ROUTE: Record<string, string> = {
  Workspace:   "workspace",
  Folder:      "workspace",
  Document:    "document",
  Dataset:     "dataset",
  PartTree:    "part-tree",
  "Part Tree": "part-tree",
};

export async function GET(req: NextRequest) {
  await getSessionUser(); // Require authentication
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json([]);

  const file = await db.file.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!file) return NextResponse.json([]);

  const ancestors = await resolveAncestors(file.id);

  return NextResponse.json(
    ancestors.map((a) => ({
      id:   a.id,
      name: a.name,
      type: a.type,
      href: `/${TYPE_ROUTE[a.type] ?? "workspace"}/${a.slug}`,
    })),
  );
}
