import { Check, X } from "lucide-react";

const rows = [
  { label: "Mathematics Solver",    excel: true,  mathcad: true,  jupyter: true,  cadwolf: true  },
  { label: "Document Appearance",   excel: false, mathcad: true,  jupyter: true,  cadwolf: true  },
  { label: "Web Based",             excel: false, mathcad: false, jupyter: false, cadwolf: true  },
  { label: "Free Version",          excel: false, mathcad: false, jupyter: false, cadwolf: true  },
  { label: "Part Tree Organization",excel: false, mathcad: false, jupyter: false, cadwolf: true  },
  { label: "Process Management",    excel: false, mathcad: false, jupyter: false, cadwolf: true  },
  { label: "Direct Link to CAD",    excel: false, mathcad: false, jupyter: false, cadwolf: true  },
];

function Cell({ value, highlight }: { value: boolean; highlight?: boolean }) {
  return (
    <td className="py-4 px-4 text-center">
      {value ? (
        <Check
          className={`inline ${highlight ? "text-blue-600" : "text-green-500"}`}
          size={highlight ? 20 : 18}
        />
      ) : (
        <X className="inline text-red-400" size={18} />
      )}
    </td>
  );
}

export default function ComparisonTable() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-700" />
                <th className="py-4 px-4 font-semibold text-gray-700 text-center">Excel</th>
                <th className="py-4 px-4 font-semibold text-gray-700 text-center">MathCAD</th>
                <th className="py-4 px-4 font-semibold text-gray-700 text-center">Jupyter</th>
                <th className="py-4 px-4 font-semibold text-blue-700 text-center">CADWOLF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-gray-100 hover:bg-white">
                  <td className="py-4 px-4 text-gray-700 font-medium">{row.label}</td>
                  <Cell value={row.excel} />
                  <Cell value={row.mathcad} />
                  <Cell value={row.jupyter} />
                  <Cell value={row.cadwolf} highlight />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
