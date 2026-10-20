-- Per-user AI chat model preference ("haiku" | "sonnet" | "opus")
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_model" TEXT NOT NULL DEFAULT 'haiku';
