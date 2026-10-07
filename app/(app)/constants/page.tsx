import constants from "@/data/constants.json";
import materials from "@/data/material.json";
import type { Constant } from "@/types/constant";

function formatValue(value: number): string {
  if (Math.abs(value) >= 1e9 || (Math.abs(value) < 1e-4 && value !== 0)) {
    return value.toExponential(4);
  }
  return value.toPrecision(7).replace(/\.?0+$/, "");
}

const CATEGORY_LABELS: Record<string, string> = {
  steel: "Steel",
  aluminum: "Aluminum",
  stainless_steel: "Stainless Steel",
  titanium: "Titanium",
  bolt: "Bolts",
  weld: "Welds",
};

const CATEGORY_ORDER = ["steel", "aluminum", "stainless_steel", "titanium", "bolt", "weld"];

const PROPERTY_LABELS: Record<string, string> = {
  yield_strength: "Yield Strength",
  ultimate_strength: "Ultimate Strength",
  elastic_modulus: "Elastic Modulus",
  shear_modulus: "Shear Modulus",
  shear_yield_strength: "Shear Yield",
  shear_ultimate_strength: "Shear Ultimate",
  bearing_yield_strength: "Bearing Yield",
  bearing_ultimate_strength: "Bearing Ultimate",
  nominal_tensile_stress: "Nominal Tensile",
  nominal_shear_stress: "Nominal Shear",
  nominal_shear_stress_threads_excluded: "Shear (threads excl.)",
  nominal_shear_stress_threads_included: "Shear (threads incl.)",
  ultimate_shear_strength: "Ultimate Shear",
  ultimate_tensile_strength: "Ultimate Tensile",
  electrode_strength: "Electrode Strength",
};

export default function ConstantsPage() {
  const data = constants as Constant[];

  const grouped: Record<string, typeof materials> = {};
  for (const m of materials) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  return (
    <div className="relative z-[1] px-8 py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Constants</h1>
        <p className="text-gray-600 leading-relaxed">
          ENGENTIC has a few constants that can be used in equations by entering
          the appropriate text. These are items like the constant &quot;pi&quot;
          or even constants with units attached. When used in an equation, the
          results are displayed with the constant&apos;s known symbol. The table
          below shows what constants are available, their values, what must be
          entered to invoke the constant, and what will be shown in the results
          of that equation. Note that you cannot create a variable with the same
          name as a constant.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
        {/* Header */}
        <div className="grid grid-cols-[120px_160px_180px_140px_1fr] bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Name</span>
          <span>Value</span>
          <span>Units</span>
          <span>Symbol</span>
          <span>Description</span>
        </div>

        {/* Rows */}
        {data.map((c, i) => (
          <div
            key={c.name}
            className={`grid grid-cols-[120px_160px_180px_140px_1fr] items-center px-4 py-3 text-sm bg-white ${
              i < data.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <span className="font-mono font-medium text-gray-800">
              {c.name}
            </span>
            <span className="font-mono text-gray-600">
              {formatValue(c.value)}
            </span>
            <span className="text-gray-500">{c.units || "—"}</span>
            <span className="font-mono text-gray-500 text-xs">
              {c.showValue}
            </span>
            <span className="text-gray-500">{c.description || "—"}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Materials</h2>
        <p className="text-gray-600 leading-relaxed">
          ENGENTIC also has material properties available as constants. Use
          the <strong>Name</strong> column directly in an equation (for
          example <code className="font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded">A36_Fy</code>{" "}
          returns 36 ksi) to pull in a material&apos;s strength or modulus
          without having to look up or re-enter the value yourself.
        </p>
      </div>

      {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => {
        const items = grouped[cat];
        return (
          <div key={cat} className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {CATEGORY_LABELS[cat] || cat}
            </h3>
            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
              <div className="grid grid-cols-[140px_200px_200px_90px_70px_1fr] bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span>Name</span>
                <span>Grade</span>
                <span>Property</span>
                <span>Value</span>
                <span>Units</span>
                <span>Source</span>
              </div>

              {items.map((m, i) => (
                <div
                  key={m.name}
                  className={`grid grid-cols-[140px_200px_200px_90px_70px_1fr] items-center px-4 py-3 text-sm bg-white ${
                    i < items.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <span className="font-mono font-medium text-gray-800">
                    {m.name}
                  </span>
                  <span className="text-gray-500">{m.grade}</span>
                  <span className="text-gray-500">
                    {PROPERTY_LABELS[m.property] || m.property}
                  </span>
                  <span className="font-mono text-gray-600">
                    {m.value.toLocaleString()}
                  </span>
                  <span className="text-gray-500">{m.units}</span>
                  <span className="text-gray-500">{m.source}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
