"use client";

import WideModal from "./WideModal";
import UnitsTable from "@/components/units/UnitsTable";
import units from "@/data/units.json";
import type { Unit } from "@/types/unit";

export default function UnitsModal({ onClose }: { onClose: () => void }) {
  return (
    <WideModal title="Units" onClose={onClose}>
      <p style={{ color: "#4b5563", lineHeight: 1.6, marginBottom: 16, fontSize: 14 }}>
        Follow any number with a unit abbreviation and CADWOLF will track its quantity, convert
        as needed, and flag mismatched-unit operations. Complex and compound units (e.g. forces)
        are recognised. You cannot mix quantities (e.g. length + force) but you can multiply and
        divide them.
      </p>
      <UnitsTable units={units as Unit[]} />
    </WideModal>
  );
}
