"use client";

import { useState } from "react";
import WideModal from "./WideModal";
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

type Tab = "constants" | "materials";

export default function ConstantsModal({ onClose }: { onClose: () => void }) {
  const data = constants as Constant[];
  const [tab, setTab] = useState<Tab>("constants");
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const filteredMaterials = search.trim()
    ? materials.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.material.toLowerCase().includes(search.toLowerCase()) ||
          m.grade.toLowerCase().includes(search.toLowerCase()) ||
          m.category.toLowerCase().includes(search.toLowerCase())
      )
    : materials;

  const grouped: Record<string, typeof materials> = {};
  for (const m of filteredMaterials) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  const tabStyle = (active: boolean) => ({
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 600 as const,
    cursor: "pointer" as const,
    border: "none",
    borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
    color: active ? "#2563eb" : "#6b7280",
    background: "transparent",
  });

  return (
    <WideModal title="Constants" onClose={onClose}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", marginBottom: 12 }}>
        <button style={tabStyle(tab === "constants")} onClick={() => setTab("constants")}>
          Constants
        </button>
        <button style={tabStyle(tab === "materials")} onClick={() => setTab("materials")}>
          Materials
        </button>
      </div>

      {tab === "constants" && (
        <>
          <p style={{ color: "#4b5563", lineHeight: 1.6, marginBottom: 16, fontSize: 14 }}>
            Use these names directly in equations. Results display using each constant&apos;s symbol.
            You cannot create a variable with the same name as a constant.
          </p>

          <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
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
        </>
      )}

      {tab === "materials" && (
        <>
          <p style={{ color: "#4b5563", lineHeight: 1.6, marginBottom: 12, fontSize: 14 }}>
            Use the <strong>Name</strong> column directly in equations, e.g. <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>A36_Fy</code> returns 36 ksi.
          </p>

          <input
            type="text"
            placeholder="Search materials, grades, properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              border: "1px solid #d1d5db",
              borderRadius: 6,
              marginBottom: 16,
              outline: "none",
            }}
          />

          {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => {
            const items = grouped[cat];
            const isExpanded = search.trim() || expandedCategory === cat;

            return (
              <div key={cat} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "10px 16px",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: isExpanded ? "8px 8px 0 0" : 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#1f2937",
                  }}
                >
                  <span style={{ fontSize: 10, color: "#6b7280" }}>{isExpanded ? "▼" : "▶"}</span>
                  {CATEGORY_LABELS[cat] || cat}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>
                    ({items.length} {items.length === 1 ? "property" : "properties"})
                  </span>
                </button>

                {isExpanded && (
                  <div style={{ border: "1px solid #e5e7eb", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "160px 1fr 200px 80px 80px",
                      background: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                      padding: "6px 16px",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>
                      <span>Name</span>
                      <span>Grade</span>
                      <span>Property</span>
                      <span>Value</span>
                      <span>Units</span>
                    </div>

                    {items.map((m, i) => (
                      <div
                        key={m.name}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "160px 1fr 200px 80px 80px",
                          alignItems: "center",
                          padding: "8px 16px",
                          fontSize: 13,
                          borderBottom: i < items.length - 1 ? "1px solid #f3f4f6" : "none",
                        }}
                      >
                        <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1f2937" }}>{m.name}</span>
                        <span style={{ color: "#6b7280", fontSize: 12 }}>{m.grade}</span>
                        <span style={{ color: "#6b7280", fontSize: 12 }}>{PROPERTY_LABELS[m.property] || m.property}</span>
                        <span style={{ fontFamily: "monospace", color: "#4b5563" }}>{m.value.toLocaleString()}</span>
                        <span style={{ color: "#6b7280" }}>{m.units}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </WideModal>
  );
}
