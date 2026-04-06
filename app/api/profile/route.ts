import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import bcrypt from "bcryptjs";
import { db } from "@/utils/db";
import { sessionOptions, type SessionData } from "@/utils/session";

async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      photoUrl: true,
      title: true,
      bio: true,
      organization: true,
      location: true,
      website: true,
      phone: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    username?: string;
    photoUrl?: string;
    title?: string;
    bio?: string;
    organization?: string;
    location?: string;
    website?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  // If changing password, verify current one
  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: "Current password required" }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.password) return NextResponse.json({ error: "No password set" }, { status: 400 });
    const valid = await bcrypt.compare(body.currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  if (body.username) {
    if (!/^[a-zA-Z0-9_-]+$/.test(body.username)) {
      return NextResponse.json(
        { error: "Username may only contain letters, numbers, underscores, and hyphens — no spaces allowed" },
        { status: 400 }
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined)         updateData.name = body.name;
  if (body.username !== undefined)     updateData.username = body.username || null;
  if (body.photoUrl !== undefined)     updateData.photoUrl = body.photoUrl || null;
  if (body.title !== undefined)        updateData.title = body.title || null;
  if (body.bio !== undefined)          updateData.bio = body.bio || null;
  if (body.organization !== undefined) updateData.organization = body.organization || null;
  if (body.location !== undefined)     updateData.location = body.location || null;
  if (body.website !== undefined)      updateData.website = body.website || null;
  if (body.phone !== undefined)        updateData.phone = body.phone || null;
  if (body.newPassword)                updateData.password = await bcrypt.hash(body.newPassword, 10);

  try {
    const updated = await db.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true, name: true, email: true, username: true,
        photoUrl: true, title: true, bio: true,
        organization: true, location: true, website: true, phone: true,
      },
    });

    // Refresh session name/username if changed
    if (body.name !== undefined || body.username !== undefined) {
      session.userName = updated.name;
      session.userUsername = updated.username;
      await session.save();
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Unique constraint") && msg.includes("username")) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { password } = await req.json() as { password?: string };

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, password: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // If user has a password, require it
  if (user.password) {
    if (!password) {
      return NextResponse.json({ error: "Password is required to delete your account" }, { status: 400 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
  }

  const userId = user.id;

  // Delete all user data
  await db.$transaction(async (tx) => {
    // Tokens
    await tx.emailVerificationToken.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.emailChangeToken.deleteMany({ where: { userId } });

    // OAuth accounts
    await tx.oAuthAccount.deleteMany({ where: { userId } });

    // Team memberships (leave teams; owned teams persist with no owner)
    await tx.teamMember.deleteMany({ where: { userId } });

    // Files and their dependents
    const files = await tx.file.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const fileIds = files.map((f) => f.id);
    if (fileIds.length > 0) {
      await tx.fileImport.deleteMany({ where: { fileId: { in: fileIds } } });
      await tx.datasetImport.deleteMany({ where: { fileId: { in: fileIds } } });
      await tx.bibliography.deleteMany({ where: { fileId: { in: fileIds } } });
      await tx.component.deleteMany({ where: { fileId: { in: fileIds } } });
      await tx.fileVersion.deleteMany({ where: { fileId: { in: fileIds } } });
      await tx.file.deleteMany({ where: { id: { in: fileIds } } });
    }

    // Datasets and datapoints
    const datasets = await tx.dataset.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const datasetIds = datasets.map((d) => d.id);
    if (datasetIds.length > 0) {
      await tx.datapoint.deleteMany({ where: { datasetId: { in: datasetIds } } });
      await tx.dataset.deleteMany({ where: { id: { in: datasetIds } } });
    }

    // Finally, delete the user
    await tx.user.delete({ where: { id: userId } });
  });

  // Clear the session
  session.destroy();

  return NextResponse.json({ ok: true });
}
