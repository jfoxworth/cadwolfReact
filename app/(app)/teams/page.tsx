import { getSessionUser } from "@/utils/getSessionUser";
import { db } from "@/utils/db";
import TeamsPage from "@/components/teams/TeamsPage";

export default async function TeamsRoute() {
  const { userId, userName } = await getSessionUser();

  const [owned, memberships] = await Promise.all([
    db.team.findMany({ where: { ownerId: userId }, include: { members: true } }),
    db.teamMember.findMany({
      where: { userId },
      include: { team: { include: { members: true } } },
    }),
  ]);

  const memberTeams = memberships.map((m) => m.team);
  const ownedIds = new Set(owned.map((t) => t.id));
  const allTeams = [...owned, ...memberTeams.filter((t) => !ownedIds.has(t.id))];

  // Filter out the auto-created personal team that shares the user's name
  const teams = allTeams.filter((t) => t.name !== userName);

  const serializable = teams.map((t) => ({
    ...t,
    storageUsed: Number(t.storageUsed),
    storageQuota: Number(t.storageQuota),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <TeamsPage
      initialTeams={serializable}
      userId={userId}
    />
  );
}
