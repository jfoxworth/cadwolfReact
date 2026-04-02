import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { db } from "@/utils/db";
import { getSessionUser } from "@/utils/getSessionUser";
import { s3, S3_BUCKET, S3_BASE_URL } from "@/utils/s3";
import { checkStorageQuota, incrementStorageUsed } from "@/utils/storage";
import { fileToItem } from "@/utils/transformers";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function extFromMime(mime: string): string {
  return { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" }[mime] ?? "jpg";
}

// POST /api/upload
// multipart/form-data: file (Blob), parentId? (string → number)
export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, GIF, and WebP images are allowed." }, { status: 415 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 413 });
  }

  // Tier + quota check
  const quota = await checkStorageQuota(userId, file.size);
  if (!quota.allowed) {
    const status = quota.reason?.includes("quota") ? 402 : 403;
    return NextResponse.json({ error: quota.reason }, { status });
  }

  // Upload to S3
  const ext = extFromMime(file.type);
  const key = `uploads/${userId}/${nanoid(10)}.${ext}`;
  const bytes = await file.arrayBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: file.type,
      ACL: "public-read",
    }),
  );

  const url = `${S3_BASE_URL}/${key}`;

  // Optionally create a File record in the workspace
  const rawParentId = formData.get("parentId");
  const parentId = rawParentId ? Number(rawParentId) : null;

  let newItem = null;
  if (parentId) {
    const newFile = await db.file.create({
      data: {
        fileTypeId: "Image",
        name: file.name,
        parentId,
        userId,
        storageBytes: BigInt(file.size),
        itemData: JSON.stringify({ imageSource: key }),
        slug: nanoid(10),
        lft: 0,
        rgt: 0,
        order: 0,
      },
    });
    newItem = fileToItem(newFile);
  }

  // Track storage
  await incrementStorageUsed(userId, file.size);

  return NextResponse.json({ url, item: newItem });
}
