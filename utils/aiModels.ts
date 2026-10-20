// Shared by the client (chat model picker) and the server (chat route, profile API) — keep free
// of server-only imports.
export const AI_MODELS = [
  { key: "haiku", label: "Haiku", id: "claude-haiku-5-5" },
  { key: "sonnet", label: "Sonnet", id: "claude-sonnet-5-5" },
  { key: "opus", label: "Opus", id: "claude-opus-5-5" },
] as const;

export type AiModelKey = (typeof AI_MODELS)[number]["key"];

export const DEFAULT_MODEL_KEY: AiModelKey = "haiku";

export function isAiModelKey(value: unknown): value is AiModelKey {
  return AI_MODELS.some((m) => m.key === value);
}

export function resolveModelId(key: AiModelKey): string {
  return AI_MODELS.find((m) => m.key === key)!.id;
}
