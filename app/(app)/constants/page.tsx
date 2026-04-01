import constants from "@/data/constants.json";
import type { Constant } from "@/types/constant";

function formatValue(value: number): string {
  if (Math.abs(value) >= 1e9 || (Math.abs(value) < 1e-4 && value !== 0)) {
    return value.toExponential(4);
  }
  return value.toPrecision(7).replace(/\.?0+$/, "");
}

export default function ConstantsPage() {
  const data = constants as Constant[];

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Constants</h1>
        <p className="text-gray-600 leading-relaxed">
          CADWOLF has a few constants that can be used in equations by entering
          the appropriate text. These are items like the constant &quot;pi&quot;
          or even constants with units attached. When used in an equation, the
          results are displayed with the constant&apos;s known symbol. The table
          below shows what constants are available, their values, what must be
          entered to invoke the constant, and what will be shown in the results
          of that equation. Note that you cannot create a variable with the same
          name as a constant.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
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
            className={`grid grid-cols-[120px_160px_180px_140px_1fr] items-center px-4 py-3 text-sm ${
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
    </div>
  );
}
