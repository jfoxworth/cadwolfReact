CREATE TABLE IF NOT EXISTS "oauth_accounts" (
    "id"                  SERIAL PRIMARY KEY,
    "user_id"             INTEGER NOT NULL,
    "provider"            TEXT NOT NULL,
    "provider_account_id" TEXT,
    "access_token"        TEXT NOT NULL,
    "refresh_token"       TEXT,
    "expires_at"          TIMESTAMP(3),
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_user_id_provider_key"
    ON "oauth_accounts"("user_id", "provider");
