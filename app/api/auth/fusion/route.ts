import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.FUSION_CLIENT_ID;
  const appUrl = req.nextUrl.origin;

  if (!clientId) {
    return NextResponse.json({ error: "FUSION_CLIENT_ID not configured" }, { status: 500 });
  }

  const redirectUri = `${appUrl}/CAD`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "data:read data:write",
  });

  return NextResponse.redirect(
    `https://developer.api.autodesk.com/authentication/v2/authorize?${params.toString()}`,
  );
}
