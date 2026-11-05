-- New users default to Sonnet. Existing rows keep whatever model they have stored.
ALTER TABLE "users" ALTER COLUMN "ai_model" SET DEFAULT 'sonnet';
