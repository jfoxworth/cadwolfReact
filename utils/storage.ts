import { db } from "@/utils/db";

interface QuotaResult {
  allowed: boolean;
  reason?: string;
  trackOn: "user" | "team";
  teamId?: number;
}

async function resolveTracking(userId: number): Promise<QuotaResult & { storageUsed: bigint; storageQuota: bigint }> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { tier: true, storageUsed: true, storageQuota: true },
  });

  if (user.tier === "pro") {
    return { allowed: true, trackOn: "user", storageUsed: user.storageUsed, storageQuota: user.storageQuota };
  }

  // Check if they own a business team
  const team = await db.team.findFirst({
    where: { ownerId: userId, tier: "business" },
    select: { id: true, storageUsed: true, storageQuota: true },
  });

  if (team) {
    return { allowed: true, trackOn: "team", teamId: team.id, storageUsed: team.storageUsed, storageQuota: team.storageQuota };
  }

  return {
    allowed: false,
    reason: "Image uploads require a Pro or Business subscription.",
    trackOn: "user",
    storageUsed: user.storageUsed,
    storageQuota: user.storageQuota,
  };
}

export async function checkStorageQuota(userId: number, bytes: number): Promise<QuotaResult> {
  const result = await resolveTracking(userId);
  if (!result.allowed) return result;

  const fits = result.storageUsed + BigInt(bytes) <= result.storageQuota;
  if (!fits) {
    return { allowed: false, reason: "Storage quota exceeded. Upgrade your plan or delete unused images.", trackOn: result.trackOn, teamId: result.teamId };
  }

  return { allowed: true, trackOn: result.trackOn, teamId: result.teamId };
}

export async function incrementStorageUsed(userId: number, bytes: number): Promise<void> {
  const result = await resolveTracking(userId);
  if (result.trackOn === "team" && result.teamId) {
    await db.team.update({
      where: { id: result.teamId },
      data: { storageUsed: { increment: BigInt(bytes) } },
    });
  } else {
    await db.user.update({
      where: { id: userId },
      data: { storageUsed: { increment: BigInt(bytes) } },
    });
  }
}

export async function decrementStorageUsed(userId: number, bytes: number): Promise<void> {
  const result = await resolveTracking(userId);
  if (result.trackOn === "team" && result.teamId) {
    const team = await db.team.findUnique({ where: { id: result.teamId }, select: { storageUsed: true } });
    const newVal = (team?.storageUsed ?? 0n) - BigInt(bytes);
    await db.team.update({
      where: { id: result.teamId },
      data: { storageUsed: newVal < 0n ? 0n : newVal },
    });
  } else {
    const user = await db.user.findUnique({ where: { id: userId }, select: { storageUsed: true } });
    const newVal = (user?.storageUsed ?? 0n) - BigInt(bytes);
    await db.user.update({
      where: { id: userId },
      data: { storageUsed: newVal < 0n ? 0n : newVal },
    });
  }
}
