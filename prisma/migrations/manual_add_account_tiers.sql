-- Add storage tracking to files
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "storage_bytes" BIGINT NOT NULL DEFAULT 0;

-- Add tier + quota tracking to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "storage_used" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "storage_quota" BIGINT NOT NULL DEFAULT 524288000;

-- Add org fields to teams
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "seat_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "storage_used" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "storage_quota" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "billing_email" TEXT;

-- Create org_invites table
CREATE TABLE IF NOT EXISTS "org_invites" (
    "id"          SERIAL PRIMARY KEY,
    "team_id"     INTEGER NOT NULL,
    "email"       TEXT NOT NULL,
    "role"        TEXT NOT NULL DEFAULT 'member',
    "token"       TEXT NOT NULL DEFAULT '',
    "expires_at"  TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "org_invites_team_id_fkey"
        FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "org_invites_token_key" ON "org_invites"("token");
