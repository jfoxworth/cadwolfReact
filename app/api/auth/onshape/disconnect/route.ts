import { NextResponse } from "next/server";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";

// DELETE /api/auth/onshape/disconnect — removes the stored Onshape OAuth account
export async function DELETE() {
  try {
    const session = await getSessionUser();
    await db.oAuthAccount.deleteMany({
      where: { userId: session.userId, provider: "onshape" },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
}
