// Shared by the client (chat model picker) and the server (chat route, profile API) — keep free
// of server-only imports.
export const AI_MODELS = [
  { key: "haiku", label: "Haiku", id: "claude-haiku-5-5" },
  { key: "sonnet", label: "Sonnet", id: "claude-sonnet-5-5" },
  { key: "opus", label: "Opus", id: "claude-opus-5-5" },
] as const;

export type AiModelKey = (typeof AI_MODELS)[number]["key"];

export const DEFAULT_MODEL_KEY: AiModelKey = "sonnet";

export function isAiModelKey(value: unknown): value is AiModelKey {
  return AI_MODELS.some((m) => m.key === value);
}

export function resolveModelId(key: AiModelKey): string {
  return AI_MODELS.find((m) => m.key === key)!.id;
}

// Values are the exact strings the API accepts for output_config.effort.
export const AI_EFFORTS = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "xhigh", label: "XHigh" },
  { key: "max", label: "Max" },
] as const;

export type AiEffortKey = (typeof AI_EFFORTS)[number]["key"];

export const DEFAULT_EFFORT_KEY: AiEffortKey = "medium";

export function isAiEffortKey(value: unknown): value is AiEffortKey {
  return AI_EFFORTS.some((e) => e.key === value);
}
