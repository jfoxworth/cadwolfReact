import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { nanoid } from "nanoid";
// Load env from .env.local
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
const envFile = readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const db = new PrismaClient({ adapter });

async function main() {
  // 1. The slug "I10oUo82d-" IS the Function Validation folder
  const fnFolder = await db.file.findFirst({
    where: { slug: "I10oUo82d-", deletedAt: null },
  });
  if (!fnFolder) throw new Error("Function Validation folder not found");

  console.log(`Found folder: ${fnFolder.name} (id: ${fnFolder.id})`);

  // 2. Create the document
  const siblingCount = await db.file.count({ where: { parentId: fnFolder.id, deletedAt: null } });
  const doc = await db.file.create({
    data: {
      fileTypeId: "Document",
      name: "linspace",
      parentId: fnFolder.id,
      userId: fnFolder.userId,
      order: siblingCount,
      slug: nanoid(10),
      itemData: "{}",
      lft: 0,
      rgt: 0,
    },
  });

  console.log(`Created document: "${doc.name}" (id: ${doc.id}, slug: ${doc.slug})`);

  // 3. Create blocks
  const blocks: Array<{ order: number; typeId: number; content: Record<string, unknown>; name: string | null }> = [
    {
      order: 0,
      typeId: 2,
      content: { _v2: true, text: "linspace", level: 1 },
      name: null,
    },
    {
      order: 1,
      typeId: 1,
      content: {
        _v2: true,
        text: "<p><strong>linspace(start, stop, n)</strong> generates <strong>n</strong> evenly-spaced values from <strong>start</strong> to <strong>stop</strong>, inclusive. The result is a row vector that can be used in plots, loops, and array operations.</p>",
      },
      name: null,
    },
    {
      order: 2,
      typeId: 2,
      content: { _v2: true, text: "Syntax", level: 2 },
      name: null,
    },
    {
      order: 3,
      typeId: 1,
      content: {
        _v2: true,
        text: [
          "<p><code>result = linspace(start, stop)</code><br/>",
          "<code>result = linspace(start, stop, n)</code></p>",
          "<table>",
          "<thead><tr><th>Parameter</th><th>Description</th></tr></thead>",
          "<tbody>",
          "<tr><td><strong>start</strong></td><td>First value in the output vector (inclusive)</td></tr>",
          "<tr><td><strong>stop</strong></td><td>Last value in the output vector (inclusive)</td></tr>",
          "<tr><td><strong>n</strong></td><td>Number of points to generate (optional, default 100, minimum 2)</td></tr>",
          "</tbody></table>",
        ].join(""),
      },
      name: null,
    },
    {
      order: 4,
      typeId: 2,
      content: { _v2: true, text: "Examples", level: 2 },
      name: null,
    },
    {
      order: 5,
      typeId: 1,
      content: { _v2: true, text: "<p>Basic usage — 5 evenly spaced values from 0 to 10:</p>" },
      name: null,
    },
    {
      order: 6,
      typeId: 3,
      content: { _v2: true, raw: "v = linspace(0, 10, 5)" },
      name: "v",
    },
    {
      order: 7,
      typeId: 1,
      content: { _v2: true, text: "<p>Using the default n — 100 evenly spaced points from 0 to 1:</p>" },
      name: null,
    },
    {
      order: 8,
      typeId: 3,
      content: { _v2: true, raw: "w = linspace(0, 1)" },
      name: "w",
    },
    {
      order: 9,
      typeId: 1,
      content: { _v2: true, text: "<p>Generating a sine wave — create an angle array from 0 to 2π, then apply sin():</p>" },
      name: null,
    },
    {
      order: 10,
      typeId: 3,
      content: { _v2: true, raw: "angles = linspace(0, 6.2832, 100)" },
      name: "angles",
    },
    {
      order: 11,
      typeId: 3,
      content: { _v2: true, raw: "y = sin(angles)" },
      name: "y",
    },
    {
      order: 12,
      typeId: 2,
      content: { _v2: true, text: "Notes", level: 2 },
      name: null,
    },
    {
      order: 13,
      typeId: 1,
      content: {
        _v2: true,
        text: [
          "<ul>",
          "<li>Both <strong>start</strong> and <strong>stop</strong> are included in the result.</li>",
          "<li>If <strong>n</strong> is omitted, 100 evenly spaced points are returned.</li>",
          "<li><strong>n</strong> is rounded to the nearest integer and clamped to a minimum of 2.</li>",
          "<li>The result is a row vector — pair it with a for loop, <code>sin()</code>, <code>cos()</code>, or a plot block for useful output.</li>",
          "</ul>",
        ].join(""),
      },
      name: null,
    },
  ];

  for (const b of blocks) {
    await db.component.create({
      data: {
        fileId: doc.id,
        componentTypeId: b.typeId,
        content: JSON.stringify(b.content),
        order: b.order,
        itemid: randomUUID(),
        name: b.name,
        inEdit: 1,
      },
    });
  }

  console.log(`Created ${blocks.length} blocks.`);
  console.log(`\nURL: http://localhost:3000/document/${doc.slug}`);
}

main().finally(() => db.$disconnect());
