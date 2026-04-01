import type { Dataset } from "@/types/dataset";
import {
  parseDataset,
  computeSizeString,
  sliceTo2D,
  type NestedStringArray,
} from "@/utils/parseDataset";

const PREVIEW_ROWS = 6;

export default function DatasetView({ dataset }: { dataset: Dataset }) {
  const parsed: NestedStringArray =
    dataset.parsers.length > 0
      ? parseDataset(dataset.rawText, dataset.parsers)
      : dataset.rawText;

  const sizeString =
    dataset.parsers.length > 0
      ? computeSizeString(parsed, dataset.parsers.length)
      : "—";

  const rows = sliceTo2D(parsed, dataset.parsers.length, []);
  const preview = rows.slice(0, PREVIEW_ROWS);
  const overflow = rows.length - PREVIEW_ROWS;

  return (
    <div className="flex flex-col gap-6">
      {/* Meta */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {sizeString}
        </span>
        {dataset.parsers.length > 0 && (
          <span className="text-xs text-gray-400">
            {dataset.parsers.map((p) => p.label).join(" × ")}
          </span>
        )}
      </div>

      {/* Preview table */}
      {dataset.rawText.trim() ? (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Data Preview
          </p>
          <div className="overflow-auto rounded-lg border border-gray-200">
            <table className="text-sm text-left w-full">
              <tbody>
                {preview.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-2 border-b border-gray-100 font-mono text-gray-700 whitespace-nowrap text-right tabular-nums"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {overflow > 0 && (
            <p className="text-xs text-gray-400 mt-2 text-right">
              …and {overflow} more row{overflow === 1 ? "" : "s"}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No data yet.</p>
      )}
    </div>
  );
}
