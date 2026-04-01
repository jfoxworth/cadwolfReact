import { readFileSync } from "fs";
const envFile = readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
const db = new PrismaClient({ adapter });
async function main() {
  const files = await db.file.findMany({
    where: { parentId: 36060, deletedAt: null },
    select: { id: true, name: true, slug: true, fileTypeId: true },
    orderBy: { order: "asc" },
  });
  console.log(JSON.stringify(files, null, 2));
}
main().finally(() => db.$disconnect());
