import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/utils/getSessionUser";
import { checkPermission } from "@/utils/checkPermission";
import { db } from "@/utils/db";
import { componentToBlock } from "@/utils/transformers";
import { buildDocumentPageContext } from "@/utils/blockToText";

// GET /api/playground/context?documentId=<id>
// What the document page hands the chat with every message: the page context text, the image URLs
// and the equations, built by the same functions the page uses (buildDocumentPageContext in
// utils/blockToText.ts) from the saved copy of the document. The playground sends these to
// /api/chat unchanged. Values appear on equations only if the saved copy holds them; the page
// itself fills them in from the solver running in the browser.
export async function GET(req: NextRequest) {
  const { userId } = await getSessionUser();

  const allowedUserId = process.env.ALLOWED_CHAT_USER_ID ? parseInt(process.env.ALLOWED_CHAT_USER_ID) : null;
  if (!allowedUserId || userId !== allowedUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documentId = Number(req.nextUrl.searchParams.get("documentId"));
  if (!Number.isInteger(documentId) || documentId <= 0) {
    return NextResponse.json({ error: "Pick a document" }, { status: 400 });
  }
  if (!(await checkPermission(documentId, userId, "view"))) {
    return NextResponse.json({ error: "You don't have access to that document." }, { status: 403 });
  }

  try {
    const components = await db.component.findMany({ where: { fileId: documentId }, orderBy: { order: "asc" } });
    const blocks = components.map(componentToBlock);

    const pageContext = buildDocumentPageContext(blocks, blocks).text;
    const pageImages = blocks
      .filter((b) => b.type === "IMAGE")
      .map((b) => (b.definition as { src?: string }).src)
      .filter((src): src is string => !!src);
    const pageEquations = blocks
      .filter((b) => b.type === "EQUATION")
      .map((b) => (b.definition as { raw?: string }).raw)
      .filter((raw): raw is string => typeof raw === "string" && raw.trim() !== "");

    return NextResponse.json({ pageContext, pageImages, pageEquations });
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't build the page context: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 500 },
    );
  }
}
