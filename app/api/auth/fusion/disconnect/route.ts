import { NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// DELETE /api/auth/fusion/disconnect — removes the stored Fusion OAuth account
export async function DELETE() {
  try {
    const session = await getSessionUser();
    await db.oAuthAccount.deleteMany({
      where: { userId: session.userId, provider: "fusion" },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
}
