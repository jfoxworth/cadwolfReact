import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";

// GET /api/file/[id]/permissions — return perm modes + explicit grants with user/team names
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canAdmin = await checkPermission(fileId, userId, "admin");
  if (!canAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const file = await db.file.findUnique({ where: { id: fileId }, select: { itemData: true } });
  let itemData: Record<string, unknown> = {};
  try { itemData = JSON.parse(file?.itemData ?? "{}"); } catch { /* ignore */ }

  const grants = await db.filePermission.findMany({ where: { fileId } });

  // Attach names to grants
  const userIds = grants.filter((g) => g.subjectType === "user").map((g) => g.subjectId);
  const teamIds = grants.filter((g) => g.subjectType === "team").map((g) => g.subjectId);

  const [users, teams] = await Promise.all([
    userIds.length ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [],
    teamIds.length ? db.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } }) : [],
  ]);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));

  return NextResponse.json({
    viewPerm: (itemData.viewPerm as string) ?? "inherit",
    editPerm: (itemData.editPerm as string) ?? "inherit",
    adminPerm: (itemData.adminPerm as string) ?? "inherit",
    grants: grants.map((g) => ({
      id: g.id,
      subjectId: g.subjectId,
      subjectType: g.subjectType,
      level: g.level,
      name: g.subjectType === "user"
        ? userMap[g.subjectId]?.name ?? userMap[g.subjectId]?.email ?? String(g.subjectId)
        : teamMap[g.subjectId]?.name ?? String(g.subjectId),
    })),
  });
}

// PUT /api/file/[id]/permissions — update modes and/or grants
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId } = await getSessionUser();
  const fileId = Number(id);

  const canAdmin = await checkPermission(fileId, userId, "admin");
  if (!canAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    viewPerm?: string;
    editPerm?: string;
    adminPerm?: string;
    grants?: { subjectId: number; subjectType: string; level: string }[];
    revokes?: { subjectId: number; subjectType: string }[];
    grantByEmail?: { email: string; level: string };
  };

  // Update perm modes in itemData
  const file = await db.file.findUnique({ where: { id: fileId }, select: { itemData: true } });
  let itemData: Record<string, unknown> = {};
  try { itemData = JSON.parse(file?.itemData ?? "{}"); } catch { /* ignore */ }

  if (body.viewPerm !== undefined) itemData.viewPerm = body.viewPerm;
  if (body.editPerm !== undefined) itemData.editPerm = body.editPerm;
  if (body.adminPerm !== undefined) itemData.adminPerm = body.adminPerm;

  const ops: Promise<unknown>[] = [
    db.file.update({ where: { id: fileId }, data: { itemData: JSON.stringify(itemData) } }),
  ];

  // Add new grants (delete existing for same subject, then create)
  for (const g of body.grants ?? []) {
    ops.push(
      db.filePermission.deleteMany({
        where: { fileId, subjectId: g.subjectId, subjectType: g.subjectType },
      }).then(() =>
        db.filePermission.create({
          data: { fileId, subjectId: g.subjectId, subjectType: g.subjectType, level: g.level },
        })
      )
    );
  }

  // Grant by email — look up user then add grant
  if (body.grantByEmail) {
    const { email, level } = body.grantByEmail;
    const target = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await db.filePermission.deleteMany({ where: { fileId, subjectId: target.id, subjectType: "user" } });
    await db.filePermission.create({ data: { fileId, subjectId: target.id, subjectType: "user", level } });
    return NextResponse.json({ ok: true });
  }

  // Revoke grants
  for (const r of body.revokes ?? []) {
    ops.push(
      db.filePermission.deleteMany({
        where: { fileId, subjectId: r.subjectId, subjectType: r.subjectType },
      })
    );
  }

  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}
