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
  const subfolders = await db.file.findMany({
    where: { parentId: 79, deletedAt: null },
    select: { id: true, name: true, fileTypeId: true, parentId: true, updatedAt: true },
  });

  const result: Array<{ subfolder: typeof subfolders[0]; children: unknown[] }> = [];

  for (const subfolder of subfolders) {
    const children = await db.file.findMany({
      where: { parentId: subfolder.id, deletedAt: null },
      select: { id: true, name: true, fileTypeId: true, parentId: true, updatedAt: true },
    });
    result.push({ subfolder, children });
  }

  console.log(JSON.stringify({ parentId: 79, subfolders: result }, null, 2));
}

main().finally(() => db.$disconnect());
