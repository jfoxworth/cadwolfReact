"use client";

import WideModal from "./WideModal";
import constants from "@/data/constants.json";
import type { Constant } from "@/types/constant";

function formatValue(value: number): string {
  if (Math.abs(value) >= 1e9 || (Math.abs(value) < 1e-4 && value !== 0)) {
    return value.toExponential(4);
  }
  return value.toPrecision(7).replace(/\.?0+$/, "");
}

export default function ConstantsModal({ onClose }: { onClose: () => void }) {
  const data = constants as Constant[];

  return (
    <WideModal title="Constants" onClose={onClose}>
      <p style={{ color: "#4b5563", lineHeight: 1.6, marginBottom: 16, fontSize: 14 }}>
        Use these names directly in equations. Results display using each constant&apos;s symbol.
        You cannot create a variable with the same name as a constant.
      </p>

      <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "120px 160px 180px 140px 1fr",
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
          padding: "8px 16px",
          fontSize: 11,
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          <span>Name</span>
          <span>Value</span>
          <span>Units</span>
          <span>Symbol</span>
          <span>Description</span>
        </div>

        {data.map((c, i) => (
          <div
            key={c.name}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 160px 180px 140px 1fr",
              alignItems: "center",
              padding: "10px 16px",
              fontSize: 13,
              borderBottom: i < data.length - 1 ? "1px solid #f3f4f6" : "none",
            }}
          >
            <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1f2937" }}>{c.name}</span>
            <span style={{ fontFamily: "monospace", color: "#4b5563" }}>{formatValue(c.value)}</span>
            <span style={{ color: "#6b7280" }}>{c.units || "—"}</span>
            <span style={{ fontFamily: "monospace", color: "#6b7280", fontSize: 11 }}>{c.showValue}</span>
            <span style={{ color: "#6b7280" }}>{c.description || "—"}</span>
          </div>
        ))}
      </div>
    </WideModal>
  );
}
