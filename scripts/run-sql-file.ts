import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";

// Applies a raw .sql file to whatever DATABASE_URL is in the environment when this runs —
// for the hand-written prisma/migrations/manual_*.sql files in this repo, which aren't
// tracked by `prisma migrate deploy`. Usage: DATABASE_URL=... npx tsx scripts/run-sql-file.ts <path>
const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/run-sql-file.ts <path-to-sql-file>");
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const db = new PrismaClient({ adapter });

async function main() {
  const sql = readFileSync(filePath, "utf-8");
  // $executeRawUnsafe goes through the extended query protocol, which (unlike node-postgres's
  // simple query protocol) doesn't support multiple statements in one call — split on
  // top-level semicolons and run each separately. Safe for these migration files: none of
  // them have a semicolon embedded inside a statement body.
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  console.log(`Applying ${filePath} (${statements.length} statements)...`);
  for (const stmt of statements) {
    await db.$executeRawUnsafe(stmt);
  }
  console.log("Done.");
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => db.$disconnect());
