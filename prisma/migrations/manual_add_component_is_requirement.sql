-- Requirement flag on blocks (TEXT / EQUATION / SYMBOLIC_EQUATION only; enforced in app code).
-- Mirrors "isRequirement" inside the block's content JSON so requirements can be queried directly.
ALTER TABLE "components" ADD COLUMN IF NOT EXISTS "is_requirement" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "components_file_id_is_requirement_idx" ON "components"("file_id", "is_requirement");
