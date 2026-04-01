import { readFileSync } from "fs";
import { randomUUID } from "crypto";

const envFile = readFileSync(".env.local", "utf8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const db = new PrismaClient({ adapter });

// Pre-determined slugs — must match what is hardcoded in the /functions page
const SLUGS: Record<string, string> = {
  "int-vec":  "doc-intvec",
  "append":   "doc-append",
  "sort":     "doc-sort00",
  "unique":   "doc-unique",
  "all":      "doc-all000",
  "any":      "doc-any000",
  "rand-mat": "doc-randmt",
  "num-inds": "doc-numind",
};

type Block = { order: number; typeId: number; content: Record<string, unknown>; name: string | null };

function h1(text: string): Block { return { order: 0, typeId: 2, content: { _v2: true, text, level: 1 }, name: null }; }
function h2(text: string, order: number): Block { return { order, typeId: 2, content: { _v2: true, text, level: 2 }, name: null }; }
function txt(html: string, order: number): Block { return { order, typeId: 1, content: { _v2: true, text: html }, name: null }; }
function eq(raw: string, name: string | null, order: number): Block { return { order, typeId: 3, content: { _v2: true, raw }, name }; }

function paramTable(rows: [string, string][]): string {
  const body = rows.map(([p, d]) => `<tr><td><strong>${p}</strong></td><td>${d}</td></tr>`).join("");
  return `<table><thead><tr><th>Parameter</th><th>Description</th></tr></thead><tbody>${body}</tbody></table>`;
}

const DOCS: { name: string; blocks: Block[] }[] = [
  // ─────────────────────────────────────────────────────────── int-vec ──
  {
    name: "int-vec",
    blocks: [
      h1("int-vec"),
      txt("<p><strong>int-vec(xdata, ydata)</strong> performs <strong>cumulative trapezoidal integration</strong> over unevenly-spaced data, similar to MATLAB's <code>cumtrapz</code>. Given parallel x and y vectors, it returns a vector where each element is the running integral from the first x value up to that point.</p>", 1),
      h2("Syntax", 2),
      txt(
        "<p><code>result = int-vec(xdata, ydata)</code></p>" +
        paramTable([
          ["xdata", "Row vector of x positions (unevenly spaced is OK)"],
          ["ydata", "Row vector of y values, same length as xdata"],
        ]) +
        "<p>The output has <strong>n − 1</strong> elements, where output[i] = ∫ y dx from x[0] to x[i+1]. Requires at least 3 points.</p>",
        3,
      ),
      h2("Examples", 4),
      txt("<p>Cumulative integral of sin(x) from 0 to π:</p>", 5),
      eq("x = linspace(0, 3.1416, 50)", "x", 6),
      eq("y = sin(x)", "y", 7),
      eq("I = int-vec(x, y)", "I", 8),
      h2("Notes", 9),
      txt(
        "<ul>" +
        "<li>Output length is <strong>n − 1</strong> (one fewer element than the inputs).</li>" +
        "<li>Uses the trapezoidal rule — accuracy improves with more data points.</li>" +
        "<li>Returns a single zero if fewer than 3 input points are provided.</li>" +
        "<li>x values do not need to be evenly spaced.</li>" +
        "</ul>",
        10,
      ),
    ],
  },

  // ─────────────────────────────────────────────────────────── append ──
  {
    name: "append",
    blocks: [
      h1("append"),
      txt("<p><strong>append(A, B, dim)</strong> concatenates two matrices along a specified dimension. Use <code>dim = 1</code> to stack columns side-by-side (horizontal), or <code>dim = 0</code> to stack rows top-to-bottom (vertical).</p>", 1),
      h2("Syntax", 2),
      txt(
        "<p><code>result = append(A, B, dim)</code></p>" +
        paramTable([
          ["A", "First matrix or vector"],
          ["B", "Second matrix or vector"],
          ["dim", "Dimension to concatenate along: 0 = vertical (add rows), 1 = horizontal (add columns)"],
        ]),
        3,
      ),
      h2("Examples", 4),
      txt("<p>Horizontal concatenation — join two row vectors side by side:</p>", 5),
      eq("a = linspace(1, 3, 3)", "a", 6),
      eq("b = linspace(4, 6, 3)", "b", 7),
      eq("c = append(a, b, 1)", "c", 8),
      txt("<p>Vertical concatenation — stack two row vectors into a 2-row matrix:</p>", 9),
      eq("d = append(a, b, 0)", "d", 10),
      h2("Notes", 11),
      txt(
        "<ul>" +
        "<li>For horizontal concatenation (<code>dim = 1</code>), both inputs must have the same number of rows.</li>" +
        "<li>For vertical concatenation (<code>dim = 0</code>), both inputs must have the same number of columns.</li>" +
        "<li>Works with scalars, row vectors, column vectors, and full matrices.</li>" +
        "</ul>",
        12,
      ),
    ],
  },

  // ───────────────────────────────────────────────────────────── sort ──
  {
    name: "sort",
    blocks: [
      h1("sort"),
      txt("<p><strong>sort(x, dir)</strong> sorts the elements of a vector. Pass a positive direction value for ascending order or a negative value for descending. The output preserves the orientation of the input (row vector → row vector, column → column).</p>", 1),
      h2("Syntax", 2),
      txt(
        "<p><code>result = sort(x)</code><br/><code>result = sort(x, dir)</code></p>" +
        paramTable([
          ["x", "Vector to sort"],
          ["dir", "Sort direction: ≥ 0 = ascending (default), < 0 = descending"],
        ]),
        3,
      ),
      h2("Examples", 4),
      txt("<p>Sort a vector in ascending order (default):</p>", 5),
      eq("v = [5, 2, 8, 1, 9, 3]", "v", 6),
      eq("asc = sort(v)", "asc", 7),
      txt("<p>Sort in descending order:</p>", 8),
      eq("desc = sort(v, -1)", "desc", 9),
      h2("Notes", 10),
      txt(
        "<ul>" +
        "<li>Passing any negative number for <code>dir</code> gives descending order.</li>" +
        "<li>Output shape matches input shape — row vectors stay row vectors.</li>" +
        "<li>Works on any flat vector; for matrices, flatten first with <code>reshape</code>.</li>" +
        "</ul>",
        11,
      ),
    ],
  },

  // ─────────────────────────────────────────────────────────── unique ──
  {
    name: "unique",
    blocks: [
      h1("unique"),
      txt("<p><strong>unique(x)</strong> returns the unique elements of a vector, sorted in ascending order and duplicates removed. Output shape matches the input orientation.</p>", 1),
      h2("Syntax", 2),
      txt(
        "<p><code>result = unique(x)</code></p>" +
        paramTable([
          ["x", "Input vector (row or column)"],
        ]),
        3,
      ),
      h2("Examples", 4),
      txt("<p>Extract unique values from an array with repeats:</p>", 5),
      eq("v = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3]", "v", 6),
      eq("u = unique(v)", "u", 7),
      h2("Notes", 8),
      txt(
        "<ul>" +
        "<li>Results are always sorted numerically in ascending order.</li>" +
        "<li>Output preserves the input's orientation (row → row, column → column).</li>" +
        "<li>Useful before building histograms or category lists from data.</li>" +
        "</ul>",
        9,
      ),
    ],
  },

  // ───────────────────────────────────────────────────────────── all ──
  {
    name: "all",
    blocks: [
      h1("all"),
      txt("<p><strong>all(x)</strong> returns <code>1</code> if every element in the vector or matrix is nonzero, and <code>0</code> if any element is zero. Useful for checking that all conditions in an array are satisfied.</p>", 1),
      h2("Syntax", 2),
      txt(
        "<p><code>result = all(x)</code></p>" +
        paramTable([
          ["x", "Vector or matrix to test"],
        ]),
        3,
      ),
      h2("Examples", 4),
      txt("<p>Check whether all elements of a vector are positive:</p>", 5),
      eq("v = [1, 2, 3, 4, 5]", "v", 6),
      eq("result = all(v)", "result", 7),
      txt("<p>An array containing a zero returns 0:</p>", 8),
      eq("w = [1, 0, 3]", "w", 9),
      eq("check = all(w)", "check", 10),
      h2("Notes", 11),
      txt(
        "<ul>" +
        "<li>Returns a scalar 1 or 0.</li>" +
        "<li>An empty input returns 1 (vacuously true).</li>" +
        "<li>Pairs naturally with <code>any()</code> and <code>if-else()</code> for conditional logic.</li>" +
        "</ul>",
        12,
      ),
    ],
  },

  // ───────────────────────────────────────────────────────────── any ──
  {
    name: "any",
    blocks: [
      h1("any"),
      txt("<p><strong>any(x)</strong> returns <code>1</code> if at least one element in the vector or matrix is nonzero, and <code>0</code> if all elements are zero. Useful for checking whether any condition in an array is met.</p>", 1),
      h2("Syntax", 2),
      txt(
        "<p><code>result = any(x)</code></p>" +
        paramTable([
          ["x", "Vector or matrix to test"],
        ]),
        3,
      ),
      h2("Examples", 4),
      txt("<p>Check whether any element exceeds a threshold:</p>", 5),
      eq("v = [0, 0, 0, 5, 0]", "v", 6),
      eq("result = any(v)", "result", 7),
      txt("<p>All-zero array returns 0:</p>", 8),
      eq("w = [0, 0, 0]", "w", 9),
      eq("check = any(w)", "check", 10),
      h2("Notes", 11),
      txt(
        "<ul>" +
        "<li>Returns a scalar 1 or 0.</li>" +
        "<li>Complements <code>all()</code> — use together to validate array conditions.</li>" +
        "<li>An empty input returns 0 (no nonzero elements exist).</li>" +
        "</ul>",
        12,
      ),
    ],
  },

  // ─────────────────────────────────────────────────────────── rand-mat ──
  {
    name: "rand-mat",
    blocks: [
      h1("rand-mat"),
      txt("<p><strong>rand-mat(lower, upper, precision, rows, cols)</strong> generates a matrix of random values between <code>lower</code> and <code>upper</code>, quantized to the specified decimal precision.</p>", 1),
      h2("Syntax", 2),
      txt(
        "<p><code>result = rand-mat(lower, upper, precision, rows, cols)</code></p>" +
        paramTable([
          ["lower", "Minimum value (inclusive)"],
          ["upper", "Maximum value"],
          ["precision", "Number of decimal places (e.g. 2 → values in steps of 0.01)"],
          ["rows", "Number of rows in the output matrix"],
          ["cols", "Number of columns in the output matrix"],
        ]),
        3,
      ),
      h2("Examples", 4),
      txt("<p>3 × 4 matrix of random integers between 1 and 10:</p>", 5),
      eq("M = rand-mat(1, 10, 0, 3, 4)", "M", 6),
      txt("<p>2 × 2 matrix of random values between 0 and 1 with 2 decimal places:</p>", 7),
      eq("R = rand-mat(0, 1, 2, 2, 2)", "R", 8),
      h2("Notes", 9),
      txt(
        "<ul>" +
        "<li><code>precision = 0</code> generates integer values.</li>" +
        "<li>Values are uniformly distributed within the specified range.</li>" +
        "<li>Each call produces a new random result — results change on every solve.</li>" +
        "</ul>",
        10,
      ),
    ],
  },

  // ─────────────────────────────────────────────────────────── num-inds ──
  {
    name: "num-inds",
    blocks: [
      h1("num-inds"),
      txt("<p><strong>num-inds(x)</strong> returns the number of index dimensions of its argument. It returns <code>1</code> for a scalar (a single value) and <code>2</code> for any vector or matrix. Useful in parameterized calculations that need to branch on whether an input is a scalar or an array.</p>", 1),
      h2("Syntax", 2),
      txt(
        "<p><code>result = num-inds(x)</code></p>" +
        paramTable([
          ["x", "Any scalar, vector, or matrix"],
        ]),
        3,
      ),
      h2("Examples", 4),
      txt("<p>Scalar input returns 1:</p>", 5),
      eq("s = 42", "s", 6),
      eq("dims_s = num-inds(s)", "dims_s", 7),
      txt("<p>Vector input returns 2:</p>", 8),
      eq("v = linspace(0, 1, 5)", "v", 9),
      eq("dims_v = num-inds(v)", "dims_v", 10),
      h2("Notes", 11),
      txt(
        "<ul>" +
        "<li>Returns <code>1</code> for a scalar (internally stored as <code>{\"0-0\": value}</code>).</li>" +
        "<li>Returns <code>2</code> for any vector or 2D matrix regardless of size.</li>" +
        "<li>Pair with <code>if-else()</code> to write functions that handle both scalar and array inputs gracefully.</li>" +
        "</ul>",
        12,
      ),
    ],
  },
];

async function main() {
  // Same folder lookup as create-linspace-doc.ts — slug "I10oUo82d-" is the Function Validation folder
  const fnFolder = await db.file.findFirst({
    where: { slug: "I10oUo82d-", deletedAt: null },
  });
  if (!fnFolder) throw new Error("Function Validation folder not found");
  console.log(`Found folder: ${fnFolder.name} (id: ${fnFolder.id})`);

  for (const docDef of DOCS) {
    const slug = SLUGS[docDef.name];
    if (!slug) throw new Error(`No slug defined for ${docDef.name}`);

    // Skip if already exists
    const existing = await db.file.findFirst({ where: { slug, deletedAt: null } });
    if (existing) {
      console.log(`SKIP: "${docDef.name}" already exists (slug: ${slug})`);
      continue;
    }

    const siblingCount = await db.file.count({ where: { parentId: fnFolder.id, deletedAt: null } });
    const doc = await db.file.create({
      data: {
        fileTypeId: "Document",
        name: docDef.name,
        parentId: fnFolder.id,
        userId: fnFolder.userId,
        order: siblingCount,
        slug,
        itemData: "{}",
        lft: 0,
        rgt: 0,
      },
    });

    // Fix order now that we have the definitive block list
    const blocks = docDef.blocks.map((b, i) => ({ ...b, order: i }));

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

    console.log(`Created "${docDef.name}" — ${blocks.length} blocks — http://localhost:3000/document/${slug}`);
  }
}

main().finally(() => db.$disconnect());
