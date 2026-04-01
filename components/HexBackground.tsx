"use client";

import { useEffect, useState } from "react";

interface HexDef {
  cx: number;
  cy: number;
  r: number;        // circumradius px
  rotation: number; // 0–60° (full visual range for a regular hexagon)
  grey: number;     // 0–255
  opacity: number;
  filled: boolean;
}

function hexPoints(cx: number, cy: number, r: number, rotation: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = ((i * 60) + rotation) * (Math.PI / 180);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
}

function generate(w: number, h: number): HexDef[] {
  const hexes: HexDef[] = [];
  const N = 160;

  for (let i = 0; i < N; i++) {
    hexes.push({
      cx: Math.random() * w,
      cy: Math.random() * h,
      r: 18 + Math.random() * 95,
      rotation: Math.random() * 60,
      grey: Math.floor(155 + Math.random() * 75),
      opacity: 0.05 + Math.random() * 0.22,
      filled: Math.random() < 0.28,
    });
  }

  return hexes;
}

export default function HexBackground() {
  const [hexes, setHexes] = useState<HexDef[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setSize({ w, h });
    setHexes(generate(w, h));
  }, []);

  if (!size.w) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <svg
        width={size.w}
        height={size.h}
        style={{ display: "block" }}
      >
        {hexes.map((hex, i) => {
          const pts = hexPoints(hex.cx, hex.cy, hex.r, hex.rotation);
          const col = `${hex.grey},${hex.grey},${hex.grey}`;
          return (
            <polygon
              key={i}
              points={pts}
              fill={hex.filled ? `rgba(${col},${(hex.opacity * 0.45).toFixed(3)})` : "none"}
              stroke={`rgba(${col},${hex.opacity.toFixed(3)})`}
              strokeWidth={1}
            />
          );
        })}
      </svg>
    </div>
  );
}
