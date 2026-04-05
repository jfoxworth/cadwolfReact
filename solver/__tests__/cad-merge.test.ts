import { describe, it, expect } from "vitest";

// Pure merge logic extracted from refresh-cad-properties/route.ts POST handler.
// Tests this logic in isolation (no DB, no Onshape API).

type ImportedCadEntry = Record<string, unknown>;

function mergeImportedCad(
  existing: ImportedCadEntry[],
  newEntry: ImportedCadEntry,
): ImportedCadEntry[] {
  const updated = [...existing];
  const eqname = String(newEntry.eqname ?? "");
  const idx = updated.findIndex((e) => String(e.eqname ?? "") === eqname);
  if (idx >= 0) updated[idx] = newEntry;
  else updated.push(newEntry);
  return updated;
}

// Simulate what getPartMassProperties returns: raw Onshape body with [display, si] arrays
function mockOnshapeBody(partId: string) {
  return {
    mass:      [0.099, 0.045],
    volume:    [0.348, 5.7e-6],
    periphery: [3.1,   0.002],
    weight_N:  0.441,
    weight_P:  0.099,
  };
}

function buildEntry(cadwolfName: string, partId: string, connId: string): ImportedCadEntry {
  const rawBody = mockOnshapeBody(partId);
  return {
    eqname:    cadwolfName,
    type:      "onshape",
    id:        connId,
    part_data: { partId, name: cadwolfName },
    mass_data: { bodies: { [partId]: rawBody } },
  };
}

describe("importedCAD merge logic", () => {
  it("appends a new entry to an empty array", () => {
    const result = mergeImportedCad([], buildEntry("EyeBolt", "JHD123", "22"));
    expect(result.length).toBe(1);
    expect(result[0].eqname).toBe("EyeBolt");
  });

  it("updates existing entry with the same eqname — does not duplicate", () => {
    const initial = [buildEntry("EyeBolt", "JHD123", "22")];
    const updated = mergeImportedCad(initial, buildEntry("EyeBolt", "JHD123", "22"));
    expect(updated.length).toBe(1);
  });

  it("replaces stale data when eqname matches", () => {
    const oldEntry: ImportedCadEntry = {
      eqname: "EyeBolt",
      _computed: true,
      properties: { mass: 99 }, // stale / wrong format
    };
    const newEntry = buildEntry("EyeBolt", "JHD123", "22");
    const result = mergeImportedCad([oldEntry], newEntry);
    expect(result.length).toBe(1);
    // New entry should have legacy format, not _computed
    expect(result[0]._computed).toBeUndefined();
    expect((result[0].mass_data as Record<string, unknown>)).toBeDefined();
  });

  it("preserves unrelated entries with different eqnames", () => {
    const existing = [
      { eqname: "fittting", type: "onshape", id: "5",
        part_data: { partId: "FIT1", name: "fittting" },
        mass_data: { bodies: { FIT1: { mass: [1, 0.5] } } } },
    ];
    const result = mergeImportedCad(existing, buildEntry("EyeBolt", "JHD123", "22"));
    expect(result.length).toBe(2);
    expect(result.find(e => e.eqname === "fittting")).toBeDefined();
    expect(result.find(e => e.eqname === "EyeBolt")).toBeDefined();
  });

  it("does not produce -all- eqname when using per-part logic", () => {
    // The per-part API requires an explicit partId — the response key is the partId,
    // never "-all-". Confirm that buildEntry never produces -all- as eqname.
    const entry = buildEntry("EyeBolt", "JHD123", "22");
    expect(entry.eqname).not.toBe("-all-");
    const massData = entry.mass_data as { bodies: Record<string, unknown> };
    expect(Object.keys(massData.bodies)).not.toContain("-all-");
  });

  it("replacing a -all- corrupted entry with a correct one by eqname", () => {
    // Simulate recovery: DB had a bad -all- entry, user refreshes and it gets replaced
    const corrupted: ImportedCadEntry = {
      eqname: "EyeBolt",
      _computed: true,
      properties: { mass: 0 }, // wrong — was fetched from -all- aggregate
    };
    const fixed = buildEntry("EyeBolt", "JHD123", "22");
    const result = mergeImportedCad([corrupted], fixed);
    expect(result.length).toBe(1);
    expect(result[0].mass_data).toBeDefined();
    expect(result[0]._computed).toBeUndefined();
  });

  it("handles multiple merges sequentially — 3 parts all end up in array", () => {
    let arr: ImportedCadEntry[] = [];
    arr = mergeImportedCad(arr, buildEntry("EyeBolt",  "JHD123", "22"));
    arr = mergeImportedCad(arr, buildEntry("Strut",     "STR456", "22"));
    arr = mergeImportedCad(arr, buildEntry("Bracket",   "BRK789", "22"));
    expect(arr.length).toBe(3);
  });

  it("second refresh of same parts does not grow the array", () => {
    let arr: ImportedCadEntry[] = [];
    arr = mergeImportedCad(arr, buildEntry("EyeBolt", "JHD123", "22"));
    arr = mergeImportedCad(arr, buildEntry("Strut",   "STR456", "22"));
    // Refresh again
    arr = mergeImportedCad(arr, buildEntry("EyeBolt", "JHD123", "22"));
    arr = mergeImportedCad(arr, buildEntry("Strut",   "STR456", "22"));
    expect(arr.length).toBe(2);
  });
});
