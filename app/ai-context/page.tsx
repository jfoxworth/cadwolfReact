import { readFileSync } from "fs";
import { join } from "path";

export const metadata = {
  title: "CadWolf AI Context",
  description:
    "System prompt and platform reference for the CadWolf AI assistant. " +
    "This page is publicly accessible so external AI systems can fetch platform context.",
};

export default function AiContextPage() {
  const content = readFileSync(
    join(process.cwd(), "prompts", "cadwolf-assistant.md"),
    "utf-8",
  );

  return (
    <main style={{ fontFamily: "monospace", padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>
        {content}
      </pre>
    </main>
  );
}
