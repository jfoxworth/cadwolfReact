-- Per-user AI chat reasoning effort ("low" | "medium" | "high" | "xhigh" | "max")
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_effort" TEXT NOT NULL DEFAULT 'medium';
