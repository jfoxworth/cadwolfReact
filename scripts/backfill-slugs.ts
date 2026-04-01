import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { nanoid } from "nanoid";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const db = new PrismaClient({ adapter });

async function main() {
  const files = await db.file.findMany({ where: { slug: "" }, select: { id: true } });
  console.log(`Backfilling ${files.length} files...`);
  for (const f of files) {
    await db.file.update({ where: { id: f.id }, data: { slug: nanoid(10) } });
  }
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
