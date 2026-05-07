import pg from 'pg';

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS file_permissions (
    id           SERIAL PRIMARY KEY,
    file_id      INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    subject_id   INTEGER NOT NULL,
    subject_type VARCHAR(10) NOT NULL,
    level        VARCHAR(10) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);
await client.query(`CREATE INDEX IF NOT EXISTS file_permissions_file_idx ON file_permissions(file_id);`);
console.log('✓ file_permissions');

await client.end();
console.log('Done.');
