# AI Integration Plan for CadWolf

## Goals

1. See what problems are being addressed and solved across documents
2. Learn how parts are designed based on historical CadWolf data
3. Learn how systems are designed (e.g., space vehicles) from aggregated design patterns
4. Long-term: train/fine-tune on domain-specific data (space vehicle design, etc.)

---

## Layer 1: RAG (Retrieval-Augmented Generation)

The foundation. Every document gets embedded on save and stored as a vector. At query time, semantic search finds relevant prior designs.

### Storage

Add `pgvector` extension to existing PostgreSQL:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_embeddings (
  id          SERIAL PRIMARY KEY,
  file_id     BIGINT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,          -- readable text extracted from blocks
  embedding   vector(1536) NOT NULL,  -- text-embedding-3-small or ada-002
  updated_at  TIMESTAMP DEFAULT now(),
  UNIQUE (file_id)
);

CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops);
```

### On Save Hook

In the document save API route, after writing to the DB:

```typescript
const text = serializeDocumentToText(blocks);
const { data } = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: text,
});
await db.$executeRaw`
  INSERT INTO document_embeddings (file_id, content, embedding)
  VALUES (${fileId}, ${text}, ${JSON.stringify(data[0].embedding)}::vector)
  ON CONFLICT (file_id) DO UPDATE
    SET content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        updated_at = now()
`;
```

### Serialization

`serializeDocumentToText` walks the blocks array and produces readable text:

```
Document: Rocket Nozzle Design
x = 500 N [thrust]
Isp = 300 s [specific impulse]
m_dot = x / (Isp * 9.81) [mass flow rate]
```

### Semantic Search

```typescript
const similar = await db.$queryRaw`
  SELECT f.id, f.name, de.content,
         1 - (de.embedding <=> ${queryVec}::vector) AS similarity
  FROM document_embeddings de
  JOIN files f ON f.id = de.file_id
  ORDER BY de.embedding <=> ${queryVec}::vector
  LIMIT 5
`;
```

---

## Layer 2: Agentic / Tool-Use

Give Claude tools to act on CadWolf data autonomously:

- `get_document(id)` — retrieve a document and its blocks
- `search_designs(query)` — semantic search over embedded documents
- `create_equation(doc_id, expression)` — add a block to a document
- `get_part_tree(id)` — retrieve a part tree structure

User prompt: "Design a propulsion system for a 500 kg LEO satellite"
→ Claude searches prior designs, reads relevant documents, and proposes a document structure.

---

## Layer 3: Fine-Tuning (Long-Term)

Once enough design data is accumulated:

- Export (input, ideal_output) pairs from historical documents
- Fine-tune a model on domain-specific patterns (nozzle sizing, structural margins, etc.)
- Anthropic doesn't expose fine-tuning yet; OpenAI does for GPT-4o

This is the long-term play after Layers 1 and 2 are producing value.

---

## UI: Chat Panel

The AI assistant is accessible via a **single hexagon in the lower-right corner** of every page, visually distinct from the navigation hexagon cluster in the lower-left. Clicking it opens a slide-out panel from the right (~400px wide) showing the conversation thread. The hexagon matches the platform's existing design language but is intentionally separated from the nav cluster — nav hexagons are for getting around, the AI hexagon is a different kind of action.

The panel has access to the current page's context (document blocks, variables, part tree state) which is injected into the system prompt automatically.

---

## System Prompt

The system prompt is a static markdown file in the repo (`prompts/cadwolf-assistant.md`) covering:
- All solver built-in functions with syntax and behavior
- Equation/block syntax rules and unit handling
- Block types and how they work

Dynamic context injected at runtime:
- Current document's blocks (equations, variables, solved values)
- RAG results (similar prior designs, once Layer 1 is built)

---

## Suggested Implementation Order

1. **`serializeDocumentToText`** utility — convert blocks to readable text
2. **`document_embeddings` table** — pgvector migration
3. **Embed on save** — hook into existing document save route
4. **Semantic search endpoint** — `/api/search?q=...`
5. **AI chat sidebar** — Claude with RAG context injected into system prompt
6. **Tool-use agent** — give Claude CadWolf tools for autonomous design assistance
