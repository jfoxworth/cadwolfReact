"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Plus,
  Hash,
  Ruler,
  Plug,
  Users,
  Home,
  Save,
  FileText,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import UnitsModal from "@/components/side-menu/UnitsModal";
import ConstantsModal from "@/components/side-menu/ConstantsModal";
import { useSideMenuAdd } from "@/context/SideMenuAddContext";

// ─── geometry (pointy-top hexagon) ───────────────────────────────────────────
//
//  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)
//  For width W:  height H = W × 2/√3 ≈ W × 1.1547  (taller than wide)
//
const HEX_CLIP =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
const SQ3 = Math.sqrt(3);

// ── main cluster ──────────────────────────────────────────────────────────────
const W = 100;
const H = (W * 2) / SQ3; // ≈ 115.47 px

const CLUSTER_W = Math.ceil(3.5 * W); // 350 px (accommodates Save hex at LowerFarRight)
const CLUSTER_H = Math.ceil((W * 5) / SQ3); // ≈ 289 px

const CENTER_POS: [number, number] = [(W * SQ3) / 2, W];

// Neighbor positions [top, left]:
// 0=Left, 1=UpperLeft, 2=UpperRight, 3=Right, 4=LowerRight, 5=LowerLeft
const NBRS: [number, number][] = [
  [(W * SQ3) / 2, 0], // 0  Left
  [0, W * 0.5], // 1  UpperLeft
  [0, W * 1.5], // 2  UpperRight  ← Add button
  [(W * SQ3) / 2, W * 2], // 3  Right
  [W * SQ3, W * 1.5], // 4  LowerRight
  [W * SQ3, W * 0.5], // 5  LowerLeft
];

// 8th hex — Save — one step right of LowerRight in the same bottom row
const SAVE_POS: [number, number] = [W * SQ3, W * 2.5];

// 9th hex — Doc — same column as Save, same row as Add (top row)
const DOC_POS: [number, number] = [0, W * 2.5];
// Doc hex center x from screen left: 32 + W*2.5 + W/2 = 32 + 250 + 50 = 332

// Add hex (NBRS[2]) center x from screen left:  32 + W*1.5 + W/2 = 32 + 200 = 232
// Add hex top tip   y from screen bottom:        40 + CLUSTER_H  = 329

// ── sub-cluster geometry ──────────────────────────────────────────────────────
//
// Both layouts use W_S = 85 so all sub-cluster hexes match in size.
// Bottom-right hex center x = SUB_LEFT(62) + 2*85 = 232  ✓  (both layouts)
//
// Workspace (≤ 4 items): 2-2 layout (2 rows)
// Document  (15 items):  2-3-2-3-2-3 layout (6 rows, bottom → top)
//
const W_S = 85;
const H_S = (W_S * 2) / SQ3; // ≈ 98.15 px
const ROW_H = (W_S * SQ3) / 2; // ≈ 73.61 px
const GAP = 30;
const LINE_X = 332;
const LINE_BOT = 40 + CLUSTER_H; // 329
const SUB_BOTTOM = LINE_BOT + GAP; // 359
const SUB_LEFT = 162; // aligns bottom-right 2-item row hex at x = 332 (Add hex, now at DOC_POS)

// Doc properties sub-cluster (3-3-2-2 layout, 10 items, bottom → top)
// Rightmost bottom-row hex center x = DOC_SUB_LEFT + 2*W_S + W_S/2 ≈ 232 (aligns with Doc hex, now at NBRS[2])
const DOC_LINE_X = 232;
const DOC_SUB_LEFT = 105;
const DOC_SUB_POSITIONS: [number, number][] = [
  [3 * ROW_H, 0],
  [3 * ROW_H, W_S],
  [3 * ROW_H, 2 * W_S], // row 0 (3, bottom)
  [2 * ROW_H, W_S / 2],
  [2 * ROW_H, (3 * W_S) / 2], // row 1 (2, offset)
  [1 * ROW_H, 0],
  [1 * ROW_H, W_S],
  [1 * ROW_H, 2 * W_S], // row 2 (3)
  [0, W_S / 2],
  [0, (3 * W_S) / 2], // row 3 (2, offset — seats into 3-item row below)
];
const DOC_SUB_H = Math.ceil(H_S + 3 * ROW_H); // ≈ 319 px
const DOC_SUB_W = 3 * W_S; // 255 px

interface SubConfig {
  SUB_H: number;
  SUB_W: number;
  positions: [number, number][];
}

function computeSubConfig(count: number): SubConfig {
  if (count > 4) {
    // Document: 2-3-2-3-2-3 rows from bottom to top
    const positions: [number, number][] = [
      [5 * ROW_H, W_S / 2],
      [5 * ROW_H, (3 * W_S) / 2], // row 0 (2)
      [4 * ROW_H, 0],
      [4 * ROW_H, W_S],
      [4 * ROW_H, 2 * W_S], // row 1 (3)
      [3 * ROW_H, W_S / 2],
      [3 * ROW_H, (3 * W_S) / 2], // row 2 (2)
      [2 * ROW_H, 0],
      [2 * ROW_H, W_S],
      [2 * ROW_H, 2 * W_S], // row 3 (3)
      [1 * ROW_H, W_S / 2],
      [1 * ROW_H, (3 * W_S) / 2], // row 4 (2)
      [0, 0],
      [0, W_S],
      [0, 2 * W_S], // row 5 (3)
    ];
    return { SUB_H: Math.ceil(H_S + 5 * ROW_H), SUB_W: 3 * W_S, positions };
  } else {
    // Workspace: 2-2 rows from bottom to top
    const all: [number, number][] = [
      [ROW_H, W_S / 2],
      [ROW_H, (3 * W_S) / 2], // row 0 (bottom)
      [0, W_S / 2],
      [0, (3 * W_S) / 2], // row 1 (top)
    ];
    return {
      SUB_H: Math.ceil(H_S + ROW_H),
      SUB_W: 2 * W_S,
      positions: all.slice(0, count) as [number, number][],
    };
  }
}

// ─── generic hex button ───────────────────────────────────────────────────────
interface HexNavProps {
  label: string;
  icon: LucideIcon;
  pos: [number, number];
  hexW: number;
  hexH: number;
  onClick: () => void;
  noShadow?: boolean;
  active?: boolean;
  accent?: "red";
  variant?: "link" | "popup";
}

function HexNav({
  label,
  icon: Icon,
  pos,
  hexW,
  hexH,
  onClick,
  noShadow,
  active,
  accent,
  variant = "popup",
}: HexNavProps) {
  const [hov, setHov] = useState(false);
  const [top, left] = pos;
  const lit = hov || active;
  const isRed = accent === "red";
  const isLink = !isRed && variant === "link";
  const glowColor = isRed
    ? "rgba(220,38,38,0.65)"
    : isLink
      ? "rgba(16,185,129,0.65)"
      : "rgba(99,102,241,0.65)";
  const haloColor = isRed
    ? "rgba(220,38,38,0.15)"
    : isLink
      ? "rgba(16,185,129,0.15)"
      : "rgba(99,102,241,0.15)";
  const litBg = isRed
    ? "linear-gradient(145deg, #fff0f0 0%, #fee2e2 100%)"
    : isLink
      ? "linear-gradient(145deg, #f0fdf9 0%, #d1fae5 100%)"
      : "linear-gradient(145deg, #f4f4ff 0%, #eaeaff 100%)";
  const unlitBg = isRed
    ? "linear-gradient(145deg, #fff5f5 0%, #fee2e2 100%)"
    : "linear-gradient(145deg, #ffffff 0%, #f2f2f2 100%)";
  const activeColor = isRed ? "#dc2626" : isLink ? "#059669" : "#4f46e5";
  const iconColor = isRed ? "#dc2626" : lit ? activeColor : "#374151";
  const labelColor = isRed ? "#dc2626" : lit ? activeColor : "#9ca3af";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      title={label}
      style={{
        position: "absolute",
        top,
        left,
        width: hexW,
        height: hexH,
        cursor: "pointer",
        zIndex: lit ? 20 : 1,
        transform: lit ? "scale(1.1) translateZ(0)" : "scale(1) translateZ(0)",
        transition:
          "transform 0.2s cubic-bezier(.34,1.56,.64,1), filter 0.2s ease",
        filter: noShadow
          ? lit
            ? `drop-shadow(0 0 12px ${glowColor})`
            : "none"
          : lit
            ? `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 4px 10px rgba(0,0,0,0.3))`
            : "drop-shadow(0 3px 8px rgba(0,0,0,0.2)) drop-shadow(0 1px 3px rgba(0,0,0,0.12))",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -4,
          clipPath: HEX_CLIP,
          background: lit ? haloColor : "transparent",
          transition: "background 0.2s",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          clipPath: HEX_CLIP,
          background: lit ? litBg : unlitBg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: HEX_CLIP,
            background: lit
              ? "linear-gradient(160deg, rgba(255,255,255,0.5) 0%, transparent 50%)"
              : "linear-gradient(160deg, rgba(255,255,255,0.85) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />
        <Icon
          size={hexW < 80 ? 18 : 24}
          style={{
            color: iconColor,
            transition: "color 0.2s",
            position: "relative",
          }}
        />
        <span
          style={{
            fontSize: hexW < 80 ? 7 : 8,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: labelColor,
            textTransform: "uppercase",
            userSelect: "none",
            position: "relative",
            transition: "color 0.2s",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
interface SideMenuNewProps {
  user: { id: number; name: string; email: string; username: string | null };
}

export default function SideMenuNew({ user }: SideMenuNewProps) {
  const router = useRouter();
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [constantsOpen, setConstantsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const { addConfig, saveConfig, docConfig } = useSideMenuAdd();

  // ── Location breadcrumb ───────────────────────────────────────────────────
  const pathname = usePathname();
  const [locationOpen, setLocationOpen] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ name: string; href: string }>>([]);
  const locationRef = useRef<HTMLDivElement>(null);

  // Extract slug from pathname (last non-empty segment)
  const slug = pathname.split("/").filter(Boolean).pop() ?? null;

  useEffect(() => {
    if (!locationOpen || !slug) return;
    setBreadcrumb([]);
    fetch(`/api/breadcrumb?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data: Array<{ name: string; href: string }>) => setBreadcrumb(data))
      .catch(() => {});
  }, [locationOpen, slug]);

  // Close on outside click
  useEffect(() => {
    if (!locationOpen) return;
    function handleClick(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [locationOpen]);

  // Close sub-cluster whenever the add config changes (page navigation)
  useEffect(() => {
    setAddOpen(false);
  }, [addConfig]);
  useEffect(() => {
    setDocOpen(false);
  }, [docConfig]);

  // Mutual exclusion between add and doc sub-clusters
  useEffect(() => {
    if (addOpen) setDocOpen(false);
  }, [addOpen]);
  useEffect(() => {
    if (docOpen) setAddOpen(false);
  }, [docOpen]);

  // Compute sub-cluster geometry from item count
  const subConfig = useMemo(
    () => (addConfig ? computeSubConfig(addConfig.items.length) : null),
    [addConfig],
  );

  const BASE_ITEMS: {
    label: string;
    icon: LucideIcon;
    pos: [number, number];
    action: () => void;
    noShadow?: boolean;
    accent?: "red";
    variant?: "link" | "popup";
  }[] = [
    {
      label: "Home",
      icon: Home,
      pos: CENTER_POS,
      action: () =>
        router.push(
          user.username ? `/workspace/${user.username}` : "/workspace",
        ),
    },
    {
      label: "Teams",
      icon: Users,
      pos: NBRS[0],
      action: () => router.push("/teams"),
    },
    {
      label: "Profile",
      icon: User,
      pos: NBRS[1],
      action: () => router.push("/profile"),
    },
    {
      label: "Connect",
      icon: Plug,
      pos: NBRS[5],
      action: () => router.push("/cadConnect"),
    },
    {
      label: "Constants",
      icon: Hash,
      pos: NBRS[4],
      variant: "link" as const,
      action: () => setConstantsOpen(true),
    },
    {
      label: "Units",
      icon: Ruler,
      pos: NBRS[3],
      variant: "link" as const,
      action: () => setUnitsOpen(true),
    },
  ];

  const ALL_ITEMS = [
    ...BASE_ITEMS,
    ...(addConfig
      ? [
          {
            label: "Add",
            icon: Plus,
            pos: docConfig ? DOC_POS : NBRS[2],
            variant: "link" as const,
            action: () => setAddOpen((v) => !v),
          },
        ]
      : []),
    ...(docConfig
      ? [
          {
            label: "Doc",
            icon: FileText,
            pos: NBRS[2],
            variant: "link" as const,
            action: () => {
              setAddOpen(false);
              setDocOpen((v) => !v);
            },
          },
        ]
      : []),
    ...(saveConfig
      ? [
          {
            label: saveConfig.saving ? "Saving" : "Save",
            icon: Save,
            pos: SAVE_POS,
            action: () => saveConfig.onSave(),
            accent: "red" as const,
          },
        ]
      : []),
  ];

  function handleAddItem(label: string) {
    addConfig?.onAdd(label);
    setAddOpen(false);
  }

  return (
    <>
      {/* ── connecting line — add sub-cluster ── */}
      <div
        style={{
          position: "fixed",
          bottom: LINE_BOT,
          left: (docConfig ? LINE_X : 232) - 0.5,
          width: 1,
          height: GAP,
          background: "rgba(156,163,175,0.5)",
          zIndex: 48,
          pointerEvents: "none",
          opacity: addOpen && subConfig ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      />

      {/* ── connecting line — doc sub-cluster ── */}
      <div
        style={{
          position: "fixed",
          bottom: LINE_BOT,
          left: DOC_LINE_X - 0.5,
          width: 1,
          height: GAP,
          background: "rgba(156,163,175,0.5)",
          zIndex: 48,
          pointerEvents: "none",
          opacity: docOpen && docConfig ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      />

      {/* ── doc-property sub-cluster ── */}
      {docConfig && (
        <div
          style={{
            position: "fixed",
            bottom: SUB_BOTTOM,
            left: DOC_SUB_LEFT,
            width: DOC_SUB_W,
            height: DOC_SUB_H,
            zIndex: 49,
            pointerEvents: "none",
            opacity: docOpen ? 1 : 0,
            visibility: docOpen ? "visible" : "hidden",
            transform: docOpen ? "translateY(0)" : "translateY(12px)",
            transition: `opacity 0.2s ease, transform 0.2s ease, visibility 0s ${docOpen ? "0s" : "0.2s"}`,
          }}
        >
          {docConfig.items.map((item, i) => (
            <HexNav
              key={item.label}
              label={item.label}
              icon={item.icon}
              pos={DOC_SUB_POSITIONS[i]}
              hexW={W_S}
              hexH={H_S}
              onClick={() => {
                item.onAction();
                setDocOpen(false);
              }}
            />
          ))}
        </div>
      )}

      {/* ── add-option sub-cluster ── */}
      {subConfig && (
        <div
          style={{
            position: "fixed",
            bottom: SUB_BOTTOM,
            left: docConfig ? SUB_LEFT : 62,
            width: subConfig.SUB_W,
            height: subConfig.SUB_H,
            zIndex: 49,
            pointerEvents: "none",
            opacity: addOpen ? 1 : 0,
            visibility: addOpen ? "visible" : "hidden",
            transform: addOpen ? "translateY(0)" : "translateY(12px)",
            transition: `opacity 0.2s ease, transform 0.2s ease, visibility 0s ${addOpen ? "0s" : "0.2s"}`,
          }}
        >
          {addConfig!.items.map((item, i) => (
            <HexNav
              key={item.label}
              label={item.label}
              icon={item.icon}
              pos={subConfig.positions[i]}
              hexW={W_S}
              hexH={H_S}
              onClick={() => handleAddItem(item.label)}
            />
          ))}
        </div>
      )}

      {/* ── main hex cluster — bottom-left ── */}
      <div
        style={{
          position: "fixed",
          bottom: 40,
          left: 32,
          width: CLUSTER_W,
          height: CLUSTER_H,
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        {ALL_ITEMS.map((item) => (
          <HexNav
            key={item.label}
            label={item.label}
            icon={item.icon}
            pos={item.pos}
            hexW={W}
            hexH={H}
            onClick={item.action}
            noShadow={item.noShadow}
            active={
              (item.label === "Add" && addOpen) ||
              (item.label === "Doc" && docOpen)
            }
            accent={item.accent}
            variant={item.variant}
          />
        ))}
      </div>

      {/* ── logo — top-left ── */}
      <div
        style={{
          position: "fixed",
          top: 24,
          left: 40,
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        <Image
          src="/logobigblack.png"
          alt="CADWOLF"
          width={250}
          height={60}
          priority
        />
      </div>

      {/* ── location pin — below logo ── */}
      {slug && (
        <div
          ref={locationRef}
          style={{ position: "fixed", top: 122, left: 40, zIndex: 50 }}
        >
          <button
            onClick={() => setLocationOpen((v) => !v)}
            title="Show location"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 0",
              color: "#9ca3af",
            }}
          >
            <MapPin size={14} />
            <span style={{ fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Location
            </span>
          </button>

          {locationOpen && (
            <div
              style={{
                marginTop: 6,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {breadcrumb.length === 0 ? (
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</span>
              ) : (
                breadcrumb.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {idx > 0 && (
                      <span style={{ color: "#d1d5db", fontSize: 11 }}>›</span>
                    )}
                    <Link
                      href={item.href}
                      onClick={() => setLocationOpen(false)}
                      style={{
                        fontSize: 12,
                        color: idx === breadcrumb.length - 1 ? "#111827" : "#6b7280",
                        fontWeight: idx === breadcrumb.length - 1 ? 600 : 400,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 200,
                        display: "block",
                      }}
                    >
                      {item.name}
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {unitsOpen && <UnitsModal onClose={() => setUnitsOpen(false)} />}
      {constantsOpen && (
        <ConstantsModal onClose={() => setConstantsOpen(false)} />
      )}
    </>
  );
}
