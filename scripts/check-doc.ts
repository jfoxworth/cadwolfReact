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

async function checkSlug(slug: string) {
  const file = await db.file.findFirst({ where: { slug, deletedAt: null } });
  console.log(`\n--- ${slug} ---`);
  console.log("File:", file ? `id=${file.id} name="${file.name}"` : "NOT FOUND");
  if (file) {
    const components = await db.component.findMany({
      where: { fileId: file.id },
      orderBy: { order: "asc" },
      select: { id: true, order: true, componentTypeId: true, name: true, content: true, inEdit: true },
    });
    console.log(`Components (${components.length}):`, JSON.stringify(components, null, 2));
  }
}

async function main() {
  await checkSlug("htJXJNE4fP");
  await checkSlug("aGaXxD2vZa");
}
main().finally(() => db.$disconnect());
