import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { getSessionUser } from "@/utils/getSessionUser";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function getSystemPrompt(): string {
  const promptPath = join(process.cwd(), "prompts", "cadwolf-assistant.md");
  return readFileSync(promptPath, "utf-8");
}

export async function POST(req: NextRequest) {
  const { userId } = await getSessionUser();

  const allowedUserId = process.env.ALLOWED_CHAT_USER_ID
    ? parseInt(process.env.ALLOWED_CHAT_USER_ID)
    : null;

  if (!allowedUserId || userId !== allowedUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { messages, pagePath } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Inject page context into the first user message so Claude knows where the user is
  const messagesWithContext = pagePath
    ? messages.map((msg: { role: string; content: string }, i: number) =>
        i === 0 && msg.role === "user"
          ? { ...msg, content: `[User is on page: ${pagePath}]\n\n${msg.content}` }
          : msg
      )
    : messages;

  const systemPrompt = getSystemPrompt();

  const stream = await client.messages.stream({
    model: process.env.AI_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: systemPrompt,
    messages: messagesWithContext,
  } as Parameters<typeof client.messages.stream>[0]);

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
    cancel() {
      stream.controller.abort();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
