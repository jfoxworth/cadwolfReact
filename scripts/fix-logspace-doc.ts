import { readFileSync } from "fs";
const envFile = readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
const db = new PrismaClient({ adapter });

async function main() {
  const sourceId = 36157; // aGaXxD2vZa — has content
  const targetId = 36156; // htJXJNE4fP — empty, user is here

  // Copy all components from source to target
  const components = await db.component.findMany({
    where: { fileId: sourceId },
    orderBy: { order: "asc" },
  });

  for (const c of components) {
    await db.component.create({
      data: {
        fileId:          targetId,
        componentTypeId: c.componentTypeId,
        content:         c.content,
        order:           c.order,
        itemid:          randomUUID(),
        name:            c.name,
        inEdit:          1,
      },
    });
  }

  // Soft-delete the duplicate
  await db.file.update({
    where: { id: sourceId },
    data: { deletedAt: new Date() },
  });

  console.log(`Copied ${components.length} blocks to htJXJNE4fP (id ${targetId})`);
  console.log(`Deleted duplicate aGaXxD2vZa (id ${sourceId})`);
  console.log(`URL: http://localhost:3000/document/htJXJNE4fP`);
}

main().finally(() => db.$disconnect());
