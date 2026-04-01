import UnitsTable from "@/components/units/UnitsTable";
import units from "@/data/units.json";
import type { Unit } from "@/types/unit";

export default function UnitsPage() {
  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Units</h1>
        <p className="text-gray-600 leading-relaxed">
          When a user enters a number into a CADWOLF equation, they can follow
          that number with a unit. CADWOLF will group that number and unit and
          ensure that the math that follows is sound. For example, an equation
          of &quot;num = 2 m + 15 in&quot; will recognize that the user is
          attempting to add 2 meters to 15 inches. Since both of those are
          lengths, CADWOLF will convert the numbers to metric — if needed — and
          perform the desired operation. If the user attempts to add items of
          two different quantities — like a length and a force — then the
          equation will produce an error. However, you can multiply and divide
          units. Complex units such as forces are recognized as well.
        </p>
        <p className="text-gray-600 leading-relaxed mt-3">
          The table below shows all of the units that CADWOLF will recognize. To
          use a unit, the abbreviation (in the left column) is simply added
          after the number. The remainder of the table shows the unit that the
          item is converted to as well as the conversion factor.
        </p>
      </div>

      <UnitsTable units={units as Unit[]} />
    </div>
  );
}
