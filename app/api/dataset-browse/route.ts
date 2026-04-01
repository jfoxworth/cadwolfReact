import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// GET /api/dataset-browse?search=<query>
// Returns all non-deleted datasets for the current user, with datapoint count.
// Optional ?search= filters by name (case-insensitive).
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";

  const { userId } = await getSessionUser();

  const datasets = await db.dataset.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id:          true,
      name:        true,
      description: true,
      _count: { select: { datapoints: { where: { deletedAt: null } } } },
    },
  });

  return NextResponse.json(
    datasets.map((d) => ({
      id:             d.id,
      name:           d.name,
      description:    d.description,
      datapointCount: d._count.datapoints,
    })),
  );
}
