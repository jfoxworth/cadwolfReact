-- AI credits. Amounts are whole units: 1 unit = one millionth of a dollar (1 credit = 1,000 units).
-- For any user: sum(ai_credit_purchases.units) - sum(ai_usage_log.cost_units) = sum(ai_credit_balances.remaining).

CREATE TABLE IF NOT EXISTS "ai_usage_log" (
    "id"                 SERIAL PRIMARY KEY,
    "user_id"            INTEGER NOT NULL,
    "page_type"          TEXT NOT NULL,
    "file_id"            INTEGER,
    "source"             TEXT NOT NULL,
    "model"              TEXT NOT NULL,
    "input_tokens"       INTEGER NOT NULL DEFAULT 0,
    "cache_read_tokens"  INTEGER NOT NULL DEFAULT 0,
    "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens"      INTEGER NOT NULL DEFAULT 0,
    "cost_units"         BIGINT NOT NULL,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ai_usage_log_user_id_created_at_idx" ON "ai_usage_log" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_log_file_id_idx" ON "ai_usage_log" ("file_id");

CREATE TABLE IF NOT EXISTS "ai_credit_purchases" (
    "id"          SERIAL PRIMARY KEY,
    "user_id"     INTEGER NOT NULL,
    "units"       BIGINT NOT NULL,
    "source"      TEXT NOT NULL,
    "reference"   TEXT NOT NULL,
    "description" TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_credit_purchases_source_reference_key" ON "ai_credit_purchases" ("source", "reference");
CREATE INDEX IF NOT EXISTS "ai_credit_purchases_user_id_idx" ON "ai_credit_purchases" ("user_id");

CREATE TABLE IF NOT EXISTS "ai_credit_balances" (
    "id"          SERIAL PRIMARY KEY,
    "purchase_id" INTEGER NOT NULL UNIQUE,
    "user_id"     INTEGER NOT NULL,
    "remaining"   BIGINT NOT NULL,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_credit_balances_purchase_id_fkey"
        FOREIGN KEY ("purchase_id") REFERENCES "ai_credit_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ai_credit_balances_user_id_idx" ON "ai_credit_balances" ("user_id");

-- Team-shared credits. team_id NULL means the user's own credits, and set means that team's shared credits.
-- ai_usage_log.user_id stays the person who made the request. The invariant above then holds per
-- account: group by team_id, or by user_id where team_id IS NULL.
ALTER TABLE "ai_usage_log"        ADD COLUMN IF NOT EXISTS "team_id" INTEGER;
ALTER TABLE "ai_credit_purchases" ADD COLUMN IF NOT EXISTS "team_id" INTEGER;
ALTER TABLE "ai_credit_balances"  ADD COLUMN IF NOT EXISTS "team_id" INTEGER;
CREATE INDEX IF NOT EXISTS "ai_usage_log_team_id_created_at_idx" ON "ai_usage_log" ("team_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_credit_purchases_team_id_idx" ON "ai_credit_purchases" ("team_id");
CREATE INDEX IF NOT EXISTS "ai_credit_balances_team_id_idx" ON "ai_credit_balances" ("team_id");

-- The account a user's AI use is charged to: NULL = their own, otherwise a team they belong to.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_account_team_id" INTEGER;

-- Optional monthly cap per team member, in units. No row = no cap.
CREATE TABLE IF NOT EXISTS "team_ai_limits" (
    "id"            SERIAL PRIMARY KEY,
    "team_id"       INTEGER NOT NULL,
    "user_id"       INTEGER NOT NULL,
    "monthly_units" BIGINT NOT NULL,
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "team_ai_limits_team_id_user_id_key" ON "team_ai_limits" ("team_id", "user_id");
