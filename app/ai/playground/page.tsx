import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUserOrNull } from "@/utils/getSessionUser";
import { AI_MODELS, AI_EFFORTS, DEFAULT_MODEL_KEY, DEFAULT_EFFORT_KEY } from "@/utils/aiModels";
import { Playground } from "./Playground";

export const metadata: Metadata = {
  title: "Document build playground — Engentic",
};

// Run a whole Document Build and see, for every model call, what was sent, the thinking and the result.
// Same access rule as the chat: only the allow-listed user (ALLOWED_CHAT_USER_ID).
export default async function PlaygroundPage() {
  const session = await getSessionUserOrNull();
  if (!session) redirect("/login");

  const allowed = process.env.ALLOWED_CHAT_USER_ID ? parseInt(process.env.ALLOWED_CHAT_USER_ID) : null;
  if (!allowed || session.userId !== allowed) notFound();

  return (
    <Playground
      models={AI_MODELS.map(({ key, label }) => ({ key, label }))}
      efforts={AI_EFFORTS.map(({ key, label }) => ({ key, label }))}
      defaultModel={DEFAULT_MODEL_KEY}
      defaultEffort={DEFAULT_EFFORT_KEY}
    />
  );
}
