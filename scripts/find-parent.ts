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
  const file = await db.file.findFirst({ where: { slug: "LC3GbG_ZEk", deletedAt: null } });
  console.log("File:", JSON.stringify(file, null, 2));

  if (file?.parentId) {
    const parent = await db.file.findUnique({ where: { id: file.parentId } });
    console.log("Parent:", JSON.stringify(parent, null, 2));
  }
}

main().finally(() => db.$disconnect());
