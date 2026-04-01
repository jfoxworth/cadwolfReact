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
  const workspace = await db.file.findFirst({ where: { slug: "I10oUo82d-", deletedAt: null } });
  console.log("Workspace:", workspace?.id, workspace?.name);

  const items = await db.file.findMany({
    where: { parentId: workspace?.id, deletedAt: null },
    select: { id: true, name: true, fileTypeId: true },
  });
  console.log("Children:", JSON.stringify(items, null, 2));
}

main().finally(() => db.$disconnect());
