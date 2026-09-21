-- Enable pgvector for RAG-style similarity search over document content
CREATE EXTENSION IF NOT EXISTS vector;

-- Block-level embeddings: one or more chunks per Component (see utils/blockToText.ts's
-- chunkTextBlock for when a block splits into more than one chunk).
CREATE TABLE IF NOT EXISTS "block_embeddings" (
    "id"           SERIAL PRIMARY KEY,
    "component_id" INTEGER NOT NULL,
    "file_id"      INTEGER NOT NULL,
    "chunk_index"  INTEGER NOT NULL DEFAULT 0,
    "chunk_text"   TEXT NOT NULL,
    "embedding"    vector(1024) NOT NULL,
    "provider"     TEXT NOT NULL DEFAULT 'voyage',
    "model"        TEXT NOT NULL DEFAULT 'voyage-4-lite',
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "block_embeddings_component_id_chunk_index_key" UNIQUE ("component_id", "chunk_index"),
    CONSTRAINT "block_embeddings_component_id_fkey"
        FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "block_embeddings_file_id_idx" ON "block_embeddings"("file_id");

-- Approximate nearest-neighbor index for cosine similarity search (used by Phase 2 retrieval,
-- not yet built) — HNSW is pgvector's current recommended index type for this.
CREATE INDEX IF NOT EXISTS "block_embeddings_embedding_idx"
    ON "block_embeddings" USING hnsw ("embedding" vector_cosine_ops);
