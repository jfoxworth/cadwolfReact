-- Add checkout locking columns to files
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "locked_by" INTEGER;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP(3);

-- Create file_versions table for snapshot history
CREATE TABLE IF NOT EXISTS "file_versions" (
    "id"            SERIAL PRIMARY KEY,
    "file_id"       INTEGER NOT NULL,
    "part_tree_id"  INTEGER,
    "version"       INTEGER NOT NULL,
    "snapshot_data" TEXT NOT NULL,
    "created_by"    INTEGER NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "file_versions_file_id_fkey"
        FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "file_versions_file_id_idx" ON "file_versions"("file_id");
CREATE INDEX IF NOT EXISTS "file_versions_part_tree_id_idx" ON "file_versions"("part_tree_id");
