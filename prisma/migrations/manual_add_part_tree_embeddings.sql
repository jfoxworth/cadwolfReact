-- Structural-similarity embeddings for Part Trees (one row per tree, recomputed via
-- utils/embedPartTree.ts whenever something inside changes). pgvector extension is already
-- enabled by manual_add_block_embeddings.sql.
CREATE TABLE IF NOT EXISTS "part_tree_embeddings" (
    "id"           SERIAL PRIMARY KEY,
    "file_id"      INTEGER NOT NULL UNIQUE,
    "summary_text" TEXT NOT NULL,
    "embedding"    vector(1024) NOT NULL,
    "provider"     TEXT NOT NULL DEFAULT 'voyage',
    "model"        TEXT NOT NULL DEFAULT 'voyage-4-lite',
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "part_tree_embeddings_file_id_fkey"
        FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Approximate nearest-neighbor index for cosine similarity search (utils/findSimilarPartTrees.ts).
CREATE INDEX IF NOT EXISTS "part_tree_embeddings_embedding_idx"
    ON "part_tree_embeddings" USING hnsw ("embedding" vector_cosine_ops);
