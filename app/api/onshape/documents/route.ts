import { NextRequest, NextResponse } from "next/server";
import { listDocuments } from "@/utils/onshape";
import { getOAuthAccount } from "@/utils/cadAuth";

// GET /api/onshape/documents?search=...
export async function GET(req: NextRequest) {
  const acct = await getOAuthAccount("onshape");
  if (!acct) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  try {
    const docs = await listDocuments(search);
    return NextResponse.json(docs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
