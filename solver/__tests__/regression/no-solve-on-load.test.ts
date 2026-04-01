/**
 * Regression test: zero solves on page load.
 *
 * When the document page loads, stored values are displayed as-is.
 * The solver must only fire in response to user actions (equation edits,
 * slider changes, etc.), never automatically on mount.
 *
 * If this test breaks, you introduced a solve-on-load regression.
 * DO NOT delete or weaken this test to make it pass — fix the code instead.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const WRAPPER = path.resolve(__dirname, "../../../components/document/documentWrapper.tsx");
const src = fs.readFileSync(WRAPPER, "utf-8");

/**
 * Scan the file line by line. Find each useEffect block and return its
 * {body, deps, startLine} so we can assert on its content.
 */
function extractUseEffects(code: string): Array<{ body: string; deps: string; startLine: number }> {
  const lines = code.split("\n");
  const results: Array<{ body: string; deps: string; startLine: number }> = [];

  let i = 0;
  while (i < lines.length) {
    if (!/\buseEffect\s*\(/.test(lines[i])) { i++; continue; }

    const startLine = i + 1; // 1-based
    const bodyLines: string[] = [];
    let braceDepth = 0;
    let foundDeps = "";
    let j = i;

    while (j < lines.length) {
      const line = lines[j];
      bodyLines.push(line);

      // Count braces to track when the callback body closes
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
      }

      // The closing line looks like: `  }, [deps]);` or `  }, [deps])`
      // It appears once brace depth is back to 0 and the line has the deps array pattern.
      if (braceDepth <= 0) {
        const m = line.match(/\},\s*\[([^\]]*)\]/);
        if (m) {
          foundDeps = `[${m[1]}]`;
          break;
        }
      }
      j++;
    }

    if (foundDeps) {
      results.push({ body: bodyLines.join("\n"), deps: foundDeps, startLine });
    }
    i = j + 1;
  }

  return results;
}

describe("No solve on page load (documentWrapper.tsx)", () => {
  const effects = extractUseEffects(src);
  const solvingEffects = effects.filter((e) => /\bsolve\s*\(/.test(e.body));

  it("file is parseable and contains solve-triggering effects (sanity check)", () => {
    // If this fails, the file changed structurally and the test needs updating.
    expect(effects.length).toBeGreaterThan(0);
    expect(solvingEffects.length).toBeGreaterThan(0);
  });

  it("no useEffect calls solve with [ready] as the only dependency", () => {
    const offenders = solvingEffects.filter((e) => e.deps === "[ready]");
    if (offenders.length > 0) {
      const detail = offenders.map((e) => `  line ${e.startLine}: ${e.deps}`).join("\n");
      throw new Error(`solve() fired on ready (page load). Remove this effect:\n${detail}`);
    }
  });

  it("no useEffect calls solve with [] (empty deps = mount-only)", () => {
    const offenders = solvingEffects.filter((e) => e.deps === "[]");
    if (offenders.length > 0) {
      const detail = offenders.map((e) => `  line ${e.startLine}: ${e.deps}`).join("\n");
      throw new Error(`solve() fired on mount (empty dep array). Remove this effect:\n${detail}`);
    }
  });

  it("every useEffect that calls solve and has mount-time deps is guarded by isFirst* ref", () => {
    // These deps are populated at initial render, so effects watching them
    // MUST skip the first run with an isFirst* guard.
    const MOUNT_TIME_DEPS = ["importSolverBlocks", "solverImportedFunctions", "datasetSolverBlocks"];

    const offenders = solvingEffects.filter((e) => {
      const hasMountTimeDep = MOUNT_TIME_DEPS.some((dep) => e.deps.includes(dep));
      const hasGuard = /isFirst/.test(e.body);
      return hasMountTimeDep && !hasGuard;
    });

    if (offenders.length > 0) {
      const detail = offenders.map((e) => `  line ${e.startLine}: ${e.deps}`).join("\n");
      throw new Error(`solve() fires at mount — add isFirst* guard:\n${detail}`);
    }
  });
});
