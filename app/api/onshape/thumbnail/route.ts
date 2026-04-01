import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "@/utils/cadAuth";

const BASE = "https://cad.onshape.com/api/v6";

// GET /api/onshape/thumbnail?documentId=...&workspaceId=...&elementId=...
// Proxies an Onshape thumbnail image so the browser can display it without
// needing its own OAuth token.
export async function GET(req: NextRequest) {
  // If a pre-stored thumbnail URL is provided, proxy it directly.
  const storedUrl = req.nextUrl.searchParams.get("url");
  if (storedUrl) {
    try {
      const token = await getValidToken("onshape");
      const imgRes = await fetch(storedUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!imgRes.ok) return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
      return new Response(imgRes.body, {
        headers: {
          "Content-Type": imgRes.headers.get("Content-Type") ?? "image/png",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  const documentId  = req.nextUrl.searchParams.get("documentId");
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  const elementId   = req.nextUrl.searchParams.get("elementId");

  if (!documentId || !workspaceId) {
    return NextResponse.json({ error: "documentId and workspaceId required" }, { status: 400 });
  }

  try {
    const token = await getValidToken("onshape");
    const authHeaders = { Authorization: `Bearer ${token}` };

    // Step 1: get available thumbnail sizes
    const metaPath = elementId
      ? `/thumbnails/d/${documentId}/w/${workspaceId}/e/${elementId}`
      : `/thumbnails/d/${documentId}/w/${workspaceId}`;

    const metaRes = await fetch(`${BASE}${metaPath}`, { headers: authHeaders });
    if (!metaRes.ok) {
      return NextResponse.json({ error: "Thumbnail not available" }, { status: 404 });
    }

    const meta = await metaRes.json() as {
      sizes?: Array<{ size: string; href: string }>;
      secondarySizes?: Array<{ size: string; href: string }>;
    };

    const sizes = meta.sizes ?? meta.secondarySizes ?? [];
    if (sizes.length === 0) {
      return NextResponse.json({ error: "No thumbnail sizes available" }, { status: 404 });
    }

    // Pick the best available size (prefer ~300px wide)
    const preferred = ["300x170", "300x300", "70x40", "600x340"];
    const chosen =
      preferred.map((p) => sizes.find((s) => s.size === p)).find(Boolean) ?? sizes[0];

    // Step 2: fetch the actual image bytes
    const imgRes = await fetch(chosen.href, { headers: authHeaders });
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
    }

    return new Response(imgRes.body, {
      headers: {
        "Content-Type": imgRes.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
