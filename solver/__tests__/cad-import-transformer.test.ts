import { describe, it, expect } from "vitest";
import { fileToItem } from "@/utils/transformers";
import type { File } from "@prisma/client";

// Minimal File stub with only the fields fileToItem reads
function makeFile(importedCAD: unknown[]): File {
  return {
    id: 1,
    slug: "test-slug",
    fileTypeId: "Document",
    name: "Test Doc",
    parentId: null,
    userId: 1,
    order: 0,
    version: 1,
    itemData: JSON.stringify({ importedCAD }),
    needsUpdate: false,
    lockedBy: null,
    lockedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    inEdit: 0,
    deletedAt: null,
  } as unknown as File;
}

// Onshape returns arrays: [displayValue, siValue]
const LEGACY_ENTRY = {
  eqname: "EyeBolt",
  type: "onshape",
  id: "22",
  part_data: { partId: "JHD123", name: "EyeBolt" },
  mass_data: {
    bodies: {
      JHD123: {
        mass:      [0.099, 0.045],   // display in lbm, SI in kg
        volume:    [0.348, 5.7e-6],  // display in in³, SI in m³
        periphery: [3.1,   0.002],   // display in in², SI in m²
        weight_N:  0.441,
        weight_P:  0.099,
      },
    },
  },
};

const COMPUTED_ENTRY = {
  eqname: "Strut",
  _computed: true,
  partName: "Strut",
  properties: { mass: 1.2, volume: 1.5e-4, surface: 0.05, weight: 11.77, density: 8000 },
};

describe("fileToItem — importedCAD transformation", () => {
  describe("legacy format (part_data + mass_data)", () => {
    it("reads mass at SI index 1 (kg), not display index 0", () => {
      const item = fileToItem(makeFile([LEGACY_ENTRY]));
      expect(item.importedCad).toBeDefined();
      const entry = item.importedCad![0];
      expect(entry.eqname).toBe("EyeBolt");
      // SI index 1 = 0.045 kg — if wrong index, would be 0.099 (lbm display)
      expect(entry.properties?.mass).toBeCloseTo(0.045);
    });

    it("reads volume at SI index 1 (m³)", () => {
      const item = fileToItem(makeFile([LEGACY_ENTRY]));
      const entry = item.importedCad![0];
      expect(entry.properties?.volume).toBeCloseTo(5.7e-6);
    });

    it("reads surface area (periphery) at SI index 1 (m²)", () => {
      const item = fileToItem(makeFile([LEGACY_ENTRY]));
      const entry = item.importedCad![0];
      expect(entry.properties?.surface).toBeCloseTo(0.002);
    });

    it("reads weight_N as weight in Newtons", () => {
      const item = fileToItem(makeFile([LEGACY_ENTRY]));
      const entry = item.importedCad![0];
      expect(entry.properties?.weight).toBeCloseTo(0.441);
    });

    it("computes density from mass/volume when not stored", () => {
      const entry = {
        ...LEGACY_ENTRY,
        mass_data: {
          bodies: {
            JHD123: {
              ...LEGACY_ENTRY.mass_data.bodies.JHD123,
              // no density field — should compute from mass/volume
            },
          },
        },
      };
      const item = fileToItem(makeFile([entry]));
      const result = item.importedCad![0];
      const expected = 0.045 / 5.7e-6;
      expect(result.properties?.density).toBeCloseTo(expected, 0);
    });

    it("sets partName from part_data.name", () => {
      const item = fileToItem(makeFile([LEGACY_ENTRY]));
      expect(item.importedCad![0].partName).toBe("EyeBolt");
    });
  });

  describe("_computed: true format (new format)", () => {
    it("passes properties through directly", () => {
      const item = fileToItem(makeFile([COMPUTED_ENTRY]));
      expect(item.importedCad).toBeDefined();
      const entry = item.importedCad![0];
      expect(entry.eqname).toBe("Strut");
      expect(entry.properties?.mass).toBe(1.2);
      expect(entry.properties?.density).toBe(8000);
    });
  });

  describe("mixed array", () => {
    it("handles both legacy and _computed entries in same array", () => {
      const item = fileToItem(makeFile([LEGACY_ENTRY, COMPUTED_ENTRY]));
      expect(item.importedCad!.length).toBe(2);
      const legacy = item.importedCad!.find(e => e.eqname === "EyeBolt");
      const computed = item.importedCad!.find(e => e.eqname === "Strut");
      expect(legacy?.properties?.mass).toBeCloseTo(0.045);
      expect(computed?.properties?.mass).toBe(1.2);
    });
  });

  describe("edge cases", () => {
    it("filters out entries with empty eqname", () => {
      const item = fileToItem(makeFile([{ eqname: "", _computed: true, properties: { mass: 1 } }]));
      expect(item.importedCad?.length ?? 0).toBe(0);
    });

    it("includes entry with eqname even if properties are undefined (no mass_data)", () => {
      const entry = { eqname: "fittting", type: "onshape", id: "5" };
      const item = fileToItem(makeFile([entry]));
      expect(item.importedCad!.length).toBe(1);
      expect(item.importedCad![0].eqname).toBe("fittting");
      // No properties because no mass_data
      expect(item.importedCad![0].properties).toBeUndefined();
    });

    it("documents: -all- eqname is stored as-is (not filtered)", () => {
      // This test documents current behavior. If "-all-" ever appears in the DB
      // (from the old broken refresh endpoint), it passes through unchanged.
      // The fix prevents -all- from being written; this test catches regression.
      const entry = { eqname: "-all-", _computed: true, properties: { mass: 99 } };
      const item = fileToItem(makeFile([entry]));
      expect(item.importedCad!.length).toBe(1);
      expect(item.importedCad![0].eqname).toBe("-all-");
    });

    it("returns undefined importedCad when itemData has no importedCAD field", () => {
      const f = {
        id: 2, slug: "s", fileTypeId: "Document", name: "N", parentId: null,
        userId: 1, order: 0, version: 1, itemData: "{}", needsUpdate: false,
        lockedBy: null, lockedAt: null, createdAt: new Date(), updatedAt: new Date(),
        inEdit: 0, deletedAt: null,
      } as unknown as File;
      const item = fileToItem(f);
      expect(item.importedCad).toBeUndefined();
    });
  });
});
