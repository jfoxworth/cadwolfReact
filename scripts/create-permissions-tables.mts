import pg from 'pg';

const { Client } = pg;
const client = new Client({
  connectionString: 'postgres://u6nudtoia4756m:p6cc3cee8069ce0aa683dfd9930dee4e273085008729d34a654fb8a47e123d2e6@c5k6ob675cp03g.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/de0d34o4sa4se9',
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
