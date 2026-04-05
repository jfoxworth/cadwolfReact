"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Trash2 } from "lucide-react";

// ── Stable modal shell (must be outside the main component to avoid remount on every render) ──
function CadModal({ title, onClose, children, footer }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t">{footer}</div>}
      </div>
    </div>
  );
}

interface Equation {
  varName: string;
  cadParamName: string;
}

interface Part {
  cadwolfName: string;
  partId: string;
  partName: string;
}

interface ConnInfo {
  documentId?: string;
  workspaceId?: string;
  elementId?: string;
  documentName?: string;
  elementName?: string;
  hubId?: string;
  hubName?: string;
  projectId?: string;
  projectName?: string;
  itemId?: string;
  versionId?: string;
  fileName?: string;
  equations?: Equation[];
  parts?: Part[];
}

interface Connection {
  id: number;
  cadType: "onshape" | "fusion";
  info: ConnInfo;
}

interface OnshapeDoc {
  id: string;
  name: string;
  defaultWorkspace: { id: string };
}

interface OnshapeElement {
  id: string;
  name: string;
  type: string;
}

interface OnshapePart {
  partId: string;
  name: string;
}

interface FusionHub {
  id: string;
  attributes: { name: string };
}

interface FusionProject {
  id: string;
  attributes: { name: string };
}

interface FusionFile {
  id: string;
  type: string;
  attributes: { name: string; extension?: string };
  versionId?: string;
}

type Step =
  | "list"
  | "export-pick"
  | "pick-provider"
  | "pick-doc"
  | "pick-element"
  | "map-parts"
  | "map-equations"
  | "fusion-hub"
  | "fusion-project"
  | "fusion-file";

type Intent = "import" | "export";

interface PushResult {
  pushed?: number;
  error?: string;
}

interface LegacyImportedCad {
  eqname: string;
  partName?: string;
  properties?: Record<string, number>;
}

interface Props {
  fileId: number;
  solverVariables: string[];
  solverValues?: Record<string, { value: number | string; units?: string }>;
  legacyImportedCad?: LegacyImportedCad[];
  onClose: () => void;
  onConnectionsChanged?: (connections: Connection[]) => void;
  onDeleteLegacyEntry?: (eqname: string) => Promise<void>;
  onRefreshCad?: () => Promise<void>;
  refreshingCad?: boolean;
  pushStatus?: Record<number, PushResult>;
  readOnly?: boolean;
}

export default function DocumentCadModal({
  fileId,
  solverVariables,
  solverValues = {},
  legacyImportedCad = [],
  onClose,
  onConnectionsChanged,
  onDeleteLegacyEntry,
  onRefreshCad,
  refreshingCad = false,
  pushStatus = {},
  readOnly = false,
}: Props) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const onConnectionsChangedRef = useRef(onConnectionsChanged);
  useEffect(() => { onConnectionsChangedRef.current = onConnectionsChanged; });
  const [step, setStep] = useState<Step>("list");
  const [intent, setIntent] = useState<Intent>("import");
  const [authStatus, setAuthStatus] = useState<{ onshape: boolean; fusion: boolean }>({
    onshape: false,
    fusion: false,
  });

  // Onshape wizard state
  const [provider, setProvider] = useState<"onshape" | "fusion">("onshape");
  const [onshapeDocs, setOnshapeDocs] = useState<OnshapeDoc[]>([]);
  const [docSearch, setDocSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<OnshapeDoc | null>(null);
  const [elements, setElements] = useState<OnshapeElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<OnshapeElement | null>(null);
  const [onshapeParts, setOnshapeParts] = useState<OnshapePart[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsError, setPartsError] = useState<string | null>(null);

  // Fusion wizard state
  const [fusionHubs, setFusionHubs] = useState<FusionHub[]>([]);
  const [selectedHub, setSelectedHub] = useState<FusionHub | null>(null);
  const [fusionProjects, setFusionProjects] = useState<FusionProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<FusionProject | null>(null);
  const [fusionFiles, setFusionFiles] = useState<FusionFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FusionFile | null>(null);
  const [folderStack, setFolderStack] = useState<string[]>([]);

  // Mapping state
  const [equations, setEquations] = useState<Equation[]>([{ varName: "", cadParamName: "" }]);
  const [parts, setParts] = useState<Part[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Edit mode
  const [editingConn, setEditingConn] = useState<Connection | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cad-connection?fileId=${fileId}`);
    const data = await res.json() as Connection[];
    setConnections(data);
    onConnectionsChangedRef.current?.(data);
    setLoading(false);
  }, [fileId]);

  useEffect(() => {
    fetchConnections();
    checkAuth();
  }, [fetchConnections]);

  async function checkAuth() {
    const [onshapeRes, fusionRes] = await Promise.all([
      fetch("/api/onshape/documents").catch(() => null),
      fetch("/api/fusion/hubs").catch(() => null),
    ]);
    setAuthStatus({
      onshape: onshapeRes?.status === 200,
      fusion: fusionRes?.status === 200,
    });
  }

  // ── Onshape loaders ──────────────────────────────────────────────────────
  async function loadOnshapeDocs(search: string) {
    const res = await fetch(`/api/onshape/documents?search=${encodeURIComponent(search)}`);
    if (!res.ok) return;
    setOnshapeDocs(await res.json() as OnshapeDoc[]);
  }

  async function loadElements(doc: OnshapeDoc) {
    const res = await fetch(
      `/api/onshape/document/${doc.id}/elements?workspaceId=${doc.defaultWorkspace.id}`,
    );
    if (!res.ok) return;
    setElements(await res.json() as OnshapeElement[]);
  }

  async function loadOnshapeParts(doc: OnshapeDoc, el: OnshapeElement) {
    setPartsLoading(true);
    setOnshapeParts([]);
    setPartsError(null);
    const res = await fetch(
      `/api/onshape/document/${doc.id}/parts?workspaceId=${doc.defaultWorkspace.id}&elementId=${el.id}`,
    );
    setPartsLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setPartsError(body.error ?? `API error ${res.status}`);
      return;
    }
    const data = await res.json();
    const fetched: OnshapePart[] = Array.isArray(data) ? data : [];
    setOnshapeParts(fetched);
    // Pre-populate part rows with defaults so the user just edits aliases
    if (fetched.length > 0) {
      setParts(fetched.map((p) => ({
        cadwolfName: p.name.replace(/\s+/g, "_").toLowerCase(),
        partId: p.partId,
        partName: p.name,
      })));
    }
  }

  // ── Fusion loaders ───────────────────────────────────────────────────────
  async function loadFusionHubs() {
    const res = await fetch("/api/fusion/hubs");
    if (!res.ok) return;
    const data = await res.json() as { data: FusionHub[] };
    setFusionHubs(data.data ?? []);
  }

  async function loadFusionProjects(hubId: string) {
    const res = await fetch(`/api/fusion/projects?hubId=${encodeURIComponent(hubId)}`);
    if (!res.ok) return;
    const data = await res.json() as { data: FusionProject[] };
    setFusionProjects(data.data ?? []);
  }

  async function loadFusionFiles(projectId: string, folderId?: string) {
    const params = new URLSearchParams({ projectId });
    if (folderId) params.set("folderId", folderId);
    const res = await fetch(`/api/fusion/files?${params}`);
    if (!res.ok) return;
    const data = await res.json() as { data: FusionFile[] };
    setFusionFiles(data.data ?? []);
  }

  // ── Delete / save ────────────────────────────────────────────────────────
  async function handleDelete(conn: Connection) {
    const name = conn.info.documentName ?? conn.info.fileName ?? conn.cadType;
    if (!confirm(`Remove CAD connection to "${name}"?`)) return;
    await fetch(`/api/cad-connection/${conn.id}`, { method: "DELETE" });
    fetchConnections();
  }

  async function handleSave() {
    const eqs = equations.filter((e) => e.varName && e.cadParamName);
    const filteredParts = parts.filter((p) => p.cadwolfName && p.partId);

    let info: ConnInfo;
    if (provider === "onshape") {
      if (!editingConn && (!selectedDoc || !selectedElement)) return;
      info = editingConn
        ? { ...editingConn.info, equations: eqs, parts: filteredParts }
        : {
            documentId: selectedDoc!.id,
            workspaceId: selectedDoc!.defaultWorkspace.id,
            elementId: selectedElement!.id,
            documentName: selectedDoc!.name,
            elementName: selectedElement!.name,
            equations: eqs,
            parts: filteredParts,
          };
    } else {
      if (!editingConn && !selectedFile) return;
      info = editingConn
        ? { ...editingConn.info, equations: eqs }
        : {
            hubId: selectedHub?.id,
            hubName: selectedHub?.attributes.name,
            projectId: selectedProject?.id,
            projectName: selectedProject?.attributes.name,
            itemId: selectedFile!.id,
            versionId: selectedFile!.versionId,
            fileName: selectedFile!.attributes.name,
            equations: eqs,
          };
    }

    setSaving(true);
    if (editingConn) {
      await fetch(`/api/cad-connection/${editingConn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ info }),
      });
    } else {
      await fetch("/api/cad-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, cadType: provider, info }),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setStep("list");
      fetchConnections();
      resetWizard();
    }, 1000);
  }

  function resetWizard() {
    setSelectedDoc(null);
    setSelectedElement(null);
    setElements([]);
    setOnshapeParts([]);
    setPartsLoading(false);
    setPartsError(null);
    setEquations([{ varName: "", cadParamName: "" }]);
    setParts([]);
    setDocSearch("");
    setEditingConn(null);
    setSelectedHub(null);
    setSelectedProject(null);
    setSelectedFile(null);
    setFusionHubs([]);
    setFusionProjects([]);
    setFusionFiles([]);
    setFolderStack([]);
  }

  function startExportEdit(conn: Connection) {
    setEditingConn(conn);
    setProvider(conn.cadType);
    setEquations(
      conn.info.equations && conn.info.equations.length > 0
        ? conn.info.equations
        : [{ varName: "", cadParamName: "" }],
    );
    setParts(conn.info.parts ?? []);
    setStep("map-equations");
  }

  // ── Equation rows ────────────────────────────────────────────────────────
  function addEquationRow() {
    setEquations((prev) => [...prev, { varName: "", cadParamName: "" }]);
  }
  function removeEquationRow(idx: number) {
    setEquations((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateEquation(idx: number, field: "varName" | "cadParamName", val: string) {
    setEquations((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: val } : e)));
  }

  // ── Part rows ────────────────────────────────────────────────────────────
  function addPartRow() {
    setParts((prev) => [...prev, { cadwolfName: "", partId: "", partName: "" }]);
  }
  function removePartRow(idx: number) {
    setParts((prev) => prev.filter((_, i) => i !== idx));
  }
  function updatePart(idx: number, field: keyof Part, val: string) {
    setParts((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
  }

  function closeWizard() { setStep("list"); resetWizard(); }

  // ══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "list") {
    const CAD_PART_PROPS = ["mass", "volume", "surface", "weight", "density"] as const;

    const allExports = connections.flatMap((c) => {
      const docLabel = c.info.documentName ?? c.info.fileName ?? "—";
      const elLabel  = c.info.elementName ?? null;
      const platform = c.cadType === "onshape" ? "Onshape" : "Fusion 360";
      return (c.info.equations ?? [])
        .filter((e) => e.varName && e.cadParamName)
        .map((e) => ({ conn: c, varName: e.varName, cadParamName: e.cadParamName, docLabel, elLabel, platform }));
    });

    const connectionImports = connections.flatMap((c) => {
      const docLabel = c.info.documentName ?? c.info.fileName ?? "—";
      const platform = c.cadType === "onshape" ? "Onshape" : "Fusion 360";
      return (c.info.parts ?? [])
        .filter((p) => p.cadwolfName)
        .flatMap((p) =>
          CAD_PART_PROPS.map((prop) => ({
            token: `${p.cadwolfName}.${prop}`,
            alias: p.cadwolfName,
            partName: p.partName,
            prop,
            docLabel,
            platform,
          })),
        );
    });

    const legacyImports = legacyImportedCad.flatMap((entry) =>
      CAD_PART_PROPS.map((prop) => ({
        token: `${entry.eqname}.${prop}`,
        alias: entry.eqname,
        partName: entry.partName ?? entry.eqname,
        prop,
        docLabel: "—",
        platform: "Onshape",
      })),
    );

    const seenTokens = new Set(connectionImports.map((r) => r.token));
    const allImports = [
      ...connectionImports,
      ...legacyImports.filter((r) => !seenTokens.has(r.token)),
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-[760px] max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-lg font-semibold">CAD Data Flows</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl leading-none">&times;</button>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-6">
            {loading ? (
              <p className="text-gray-400 text-sm">Loading…</p>
            ) : (
              <>
                {/* ── Exported: Document → CAD ── */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Exported from this document → CAD
                  </h3>
                  {allExports.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No variables mapped for export.</p>
                  ) : (
                    <table className="w-full text-sm border rounded overflow-hidden">
                      <thead className="bg-gray-50 border-b">
                        <tr className="text-xs text-gray-500 font-medium">
                          <th className="text-left px-3 py-2">Variable</th>
                          <th className="text-left px-3 py-2">Current value</th>
                          <th className="text-left px-3 py-2">CAD parameter</th>
                          <th className="text-left px-3 py-2">Platform</th>
                          <th className="text-left px-3 py-2">CAD file</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {allExports.map((row, idx) => {
                          const sv = solverValues[row.varName.toLowerCase()];
                          const ps = pushStatus[row.conn.id];
                          return (
                            <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono text-gray-800">{row.varName}</td>
                              <td className="px-3 py-2 text-gray-700">
                                {sv !== undefined
                                  ? `${typeof sv.value === "number" ? sv.value.toPrecision(4) : sv.value}${sv.units ? " " + sv.units : ""}`
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-2 text-gray-600 font-mono">{row.cadParamName}</td>
                              <td className="px-3 py-2 text-gray-500 text-xs">{row.platform}</td>
                              <td className="px-3 py-2 text-gray-500 text-xs">
                                {row.docLabel}
                                {row.elLabel && <span className="text-gray-400"> › {row.elLabel}</span>}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {ps
                                  ? ps.error
                                    ? <span className="text-red-500" title={ps.error}>✗</span>
                                    : <span className="text-green-600">✓</span>
                                  : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </section>

                {/* ── Imported: CAD → Document ── */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Imported into this document ← CAD
                    </h3>
                    {!readOnly && onRefreshCad && (
                      <button
                        onClick={onRefreshCad}
                        disabled={refreshingCad}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-1"
                      >
                        {refreshingCad ? "Refreshing…" : "↻ Refresh from CAD"}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const importedByAlias = new Map<string, Record<string, number>>();
                    for (const entry of legacyImportedCad) {
                      if (entry.eqname && entry.properties) importedByAlias.set(entry.eqname, entry.properties);
                    }
                    return allImports.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No CAD parts mapped for import.</p>
                    ) : (
                      <table className="w-full text-sm border rounded overflow-hidden">
                        <thead className="bg-gray-50 border-b">
                          <tr className="text-xs text-gray-500 font-medium">
                            <th className="text-left px-3 py-2">Token</th>
                            <th className="text-left px-3 py-2">Current value</th>
                            <th className="text-left px-3 py-2">Part</th>
                            <th className="text-left px-3 py-2">Platform</th>
                            <th className="text-left px-3 py-2">CAD file</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                          const seenAliases = new Set<string>();
                          return allImports.map((row, idx) => {
                            const propValue = importedByAlias.get(row.alias)?.[row.prop];
                            const isFirstForAlias = !seenAliases.has(row.alias);
                            if (isFirstForAlias) seenAliases.add(row.alias);
                            return (
                              <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="px-3 py-2 font-mono text-gray-800">{row.token}</td>
                                <td className="px-3 py-2 text-gray-700">
                                  {propValue !== undefined
                                    ? propValue.toPrecision(4)
                                    : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-2 text-gray-500 text-xs">{row.partName || row.alias}</td>
                                <td className="px-3 py-2 text-gray-500 text-xs">{row.platform}</td>
                                <td className="px-3 py-2 text-gray-500 text-xs">{row.docLabel}</td>
                                <td className="px-3 py-2">
                                  {isFirstForAlias && !readOnly && onDeleteLegacyEntry && (
                                    <button
                                      onClick={() => onDeleteLegacyEntry(row.alias)}
                                      title={`Remove ${row.alias} from imported CAD data`}
                                      className="text-gray-400 hover:text-red-600"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  );
                  })()}
                </section>
              </>
            )}
          </div>

          <div className="px-5 py-4 border-t flex justify-between items-center">
            <div className="text-xs text-gray-400 space-x-4">
              <span>
                Onshape:{" "}
                {authStatus.onshape
                  ? <span className="text-green-600">Connected</span>
                  : readOnly
                    ? <span className="text-gray-400">—</span>
                    : <a href="/api/auth/onshape" target="_blank" className="text-blue-600 hover:underline">Connect</a>}
              </span>
              <span>
                Fusion:{" "}
                {authStatus.fusion
                  ? <span className="text-green-600">Connected</span>
                  : readOnly
                    ? <span className="text-gray-400">—</span>
                    : <a href="/api/auth/fusion" target="_blank" className="text-blue-600 hover:underline">Connect</a>}
              </span>
            </div>
            <div className="flex gap-2">
              {!readOnly && (
                <>
                  <button
                    onClick={() => { setIntent("import"); resetWizard(); setStep("pick-provider"); }}
                    className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    ↓ Import from CAD
                  </button>
                  <button
                    onClick={() => {
                      setIntent("export");
                      resetWizard();
                      if (connections.length > 0) {
                        setStep("export-pick");
                      } else {
                        setStep("pick-provider");
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    ↑ Export to CAD
                  </button>
                </>
              )}
              <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT: PICK EXISTING CONNECTION
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "export-pick") {
    return (
      <CadModal
        onClose={closeWizard}
        title="Export Equation to CAD"
        footer={
          <div className="flex justify-between w-full">
            <button onClick={() => setStep("list")} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Back</button>
            <button
              onClick={() => setStep("pick-provider")}
              className="px-4 py-2 border border-blue-300 text-blue-700 rounded text-sm hover:bg-blue-50"
            >
              Browse new CAD file…
            </button>
          </div>
        }
      >
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4">
            Select a connected CAD file to add or update equation mappings.
          </p>
          <div className="flex flex-col gap-2">
            {connections.map((conn) => {
              const label = conn.info.documentName ?? conn.info.fileName ?? conn.cadType;
              const sub = conn.info.elementName ?? (conn.cadType === "fusion" ? "Fusion 360" : "Onshape");
              const eqCount = (conn.info.equations ?? []).filter((e) => e.varName && e.cadParamName).length;
              return (
                <button
                  key={conn.id}
                  onClick={() => startExportEdit(conn)}
                  className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-blue-50 hover:border-blue-400 text-left transition"
                >
                  <div>
                    <div className="font-medium text-sm text-gray-800">{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0 ml-4">
                    {eqCount > 0 ? `${eqCount} mapped` : "No mappings yet"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CadModal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PICK PROVIDER
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "pick-provider") {
    const title = intent === "import" ? "Import from CAD — Choose Platform" : "Export to CAD — Choose Platform";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-[400px] p-6">
          <h2 className="text-lg font-semibold mb-4">{title}</h2>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setProvider("onshape");
                if (!authStatus.onshape) { window.open("/api/auth/onshape", "_blank"); return; }
                loadOnshapeDocs("");
                setStep("pick-doc");
              }}
              className="border rounded-lg p-4 text-left hover:bg-blue-50 hover:border-blue-400 transition"
            >
              <div className="font-medium">Onshape</div>
              <div className="text-sm text-gray-500 mt-1">
                {authStatus.onshape ? "Browse documents" : "Click to authenticate first"}
              </div>
            </button>
            <button
              onClick={() => {
                setProvider("fusion");
                if (!authStatus.fusion) { window.open("/api/auth/fusion", "_blank"); return; }
                loadFusionHubs();
                setStep("fusion-hub");
              }}
              className="border rounded-lg p-4 text-left hover:bg-orange-50 hover:border-orange-400 transition"
            >
              <div className="font-medium">Fusion 360</div>
              <div className="text-sm text-gray-500 mt-1">
                {authStatus.fusion ? "Browse files" : "Click to authenticate first"}
              </div>
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => intent === "export" && connections.length > 0 ? setStep("export-pick") : setStep("list")}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ONSHAPE: PICK DOCUMENT
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "pick-doc") {
    return (
      <CadModal
        onClose={closeWizard}
        title="Select Onshape Document"
        footer={
          <button onClick={() => setStep("pick-provider")} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Back</button>
        }
      >
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Search documents…"
            className="w-full border rounded px-3 py-2 text-sm"
            value={docSearch}
            onChange={(e) => { setDocSearch(e.target.value); loadOnshapeDocs(e.target.value); }}
          />
        </div>
        <div>
          {onshapeDocs.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">No documents found.</p>
          ) : (
            onshapeDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  setSelectedDoc(doc);
                  loadElements(doc);
                  setStep("pick-element");
                }}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b text-sm"
              >
                {doc.name}
              </button>
            ))
          )}
        </div>
      </CadModal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ONSHAPE: PICK ELEMENT
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "pick-element") {
    return (
      <CadModal
        onClose={closeWizard}
        title={intent === "import" ? "Select Part Studio" : "Select Element"}
        footer={
          <button onClick={() => setStep("pick-doc")} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Back</button>
        }
      >
        <div className="text-xs text-gray-500 px-4 pt-3 pb-1">{selectedDoc?.name}</div>
        <div>
          {elements.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">No elements found.</p>
          ) : (
            elements.map((el) => (
              <button
                key={el.id}
                onClick={() => {
                  setSelectedElement(el);
                  // Import: load parts for alias mapping. Export: no parts needed.
                  if (intent === "import" && selectedDoc) loadOnshapeParts(selectedDoc, el);
                  setStep(intent === "export" ? "map-equations" : "map-parts");
                }}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b text-sm"
              >
                <span className="font-medium">{el.name}</span>
                <span className="ml-2 text-gray-400 text-xs">{el.type}</span>
              </button>
            ))
          )}
        </div>
      </CadModal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAP PARTS (import flow only — assigns aliases for mass property pull)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "map-parts") {
    return (
      <CadModal
        onClose={closeWizard}
        title="Import CAD Properties — Assign Aliases"
        footer={
          <div className="flex justify-between w-full">
            <button onClick={() => setStep("pick-element")} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Back</button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`px-4 py-2 text-white rounded text-sm disabled:opacity-50 ${saved ? "bg-green-500" : "bg-green-600 hover:bg-green-700"}`}
            >
              {saved ? "Saved ✓" : saving ? "Saving…" : "Save Import"}
            </button>
          </div>
        }
      >
        <div className="px-5 py-3 bg-gray-50 border-b text-sm text-gray-600">
          <span><strong>{selectedDoc?.name}</strong> › {selectedElement?.name}</span>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500 mb-3">
            Assign a CadWolf alias to each Onshape part you want to reference in equations.
            Once saved, use <code className="bg-gray-100 px-1 rounded">alias.mass</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">alias.volume</code>, etc.
          </p>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500">CadWolf Alias</span>
            <span className="text-xs font-medium text-gray-500">Onshape Part</span>
            <span />
          </div>

          {partsLoading && (
            <p className="text-xs text-gray-400 mb-2">Loading parts from Onshape…</p>
          )}
          {!partsLoading && partsError && (
            <p className="text-xs text-red-600 mb-2 break-all">
              Error loading parts: {partsError}
            </p>
          )}
          {!partsLoading && !partsError && onshapeParts.length === 0 && (
            <p className="text-xs text-amber-600 mb-2">
              No parts returned for this element. This may be an Assembly (only Part Studios have parts), or the Part Studio may be empty.
            </p>
          )}

          {parts.map((p, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. wheel"
                value={p.cadwolfName}
                onChange={(e) => updatePart(idx, "cadwolfName", e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              />
              <select
                value={p.partId}
                onChange={(e) => {
                  const selected = onshapeParts.find((pt) => pt.partId === e.target.value);
                  if (selected) {
                    setParts((prev) => prev.map((pp, i) =>
                      i === idx ? { ...pp, partId: selected.partId, partName: selected.name } : pp,
                    ));
                  }
                }}
                className="border rounded px-2 py-1.5 text-sm"
                disabled={onshapeParts.length === 0}
              >
                <option value="">
                  {partsLoading ? "Loading…" : onshapeParts.length === 0 ? "No parts available" : "— select part —"}
                </option>
                {onshapeParts.map((pt) => (
                  <option key={pt.partId} value={pt.partId}>{pt.name}</option>
                ))}
              </select>
              <button onClick={() => removePartRow(idx)} className="text-red-400 hover:text-red-600 text-sm px-1">×</button>
            </div>
          ))}

          <button onClick={addPartRow} className="text-green-700 text-sm hover:underline mt-1">
            + Add part alias
          </button>
        </div>
      </CadModal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FUSION: PICK HUB
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "fusion-hub") {
    return (
      <CadModal
        onClose={closeWizard}
        title="Select Fusion Hub"
        footer={
          <button onClick={() => setStep("pick-provider")} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Back</button>
        }
      >
        <div className="p-2">
          {fusionHubs.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">No hubs found.</p>
          ) : (
            fusionHubs.map((hub) => (
              <button
                key={hub.id}
                onClick={() => {
                  setSelectedHub(hub);
                  loadFusionProjects(hub.id);
                  setStep("fusion-project");
                }}
                className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b text-sm"
              >
                {hub.attributes.name}
              </button>
            ))
          )}
        </div>
      </CadModal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FUSION: PICK PROJECT
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "fusion-project") {
    return (
      <CadModal
        onClose={closeWizard}
        title="Select Project"
        footer={
          <button onClick={() => setStep("fusion-hub")} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Back</button>
        }
      >
        <div className="text-xs text-gray-500 px-4 pt-3 pb-1">{selectedHub?.attributes.name}</div>
        <div className="p-2">
          {fusionProjects.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">No projects found.</p>
          ) : (
            fusionProjects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => {
                  setSelectedProject(proj);
                  loadFusionFiles(proj.id);
                  setStep("fusion-file");
                }}
                className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b text-sm"
              >
                {proj.attributes.name}
              </button>
            ))
          )}
        </div>
      </CadModal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FUSION: PICK FILE
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "fusion-file") {
    return (
      <CadModal
        onClose={closeWizard}
        title={intent === "import" ? "Import from Fusion — Select File" : "Export to Fusion — Select File"}
        footer={
          <div className="flex justify-between w-full">
            <button
              onClick={() => {
                if (folderStack.length > 0) {
                  const stack = [...folderStack];
                  const parentId = stack.pop();
                  setFolderStack(stack);
                  loadFusionFiles(selectedProject!.id, parentId);
                } else {
                  setStep("fusion-project");
                }
              }}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        }
      >
        <div className="text-xs text-gray-500 px-4 pt-3 pb-1">
          {selectedHub?.attributes.name} › {selectedProject?.attributes.name}
          {folderStack.length > 0 && " › …"}
        </div>
        <div>
          {fusionFiles.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">No files found.</p>
          ) : (
            fusionFiles.map((f) => {
              const isFolder = f.type === "folders";
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    if (isFolder) {
                      setFolderStack((prev) => [...prev, f.id]);
                      loadFusionFiles(selectedProject!.id, f.id);
                    } else {
                      setSelectedFile(f);
                      // Both import and export go to map-equations for Fusion
                      // (Fusion doesn't have the same part-level API as Onshape)
                      setStep("map-equations");
                    }
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b text-sm flex items-center gap-2"
                >
                  <span>{isFolder ? "📁" : "📄"}</span>
                  <span>{f.attributes.name}</span>
                  {!isFolder && f.attributes.extension && (
                    <span className="text-gray-400 text-xs">.{f.attributes.extension}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </CadModal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAP EQUATIONS (export flow)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === "map-equations") {
    const backStep: Step = editingConn
      ? "export-pick"
      : provider === "fusion"
        ? "fusion-file"
        : "pick-element";

    return (
      <CadModal
        onClose={closeWizard}
        title="Export Equations to CAD"
        footer={
          <div className="flex justify-between w-full">
            <button
              onClick={() => {
                if (editingConn) { setStep("export-pick"); resetWizard(); }
                else setStep(backStep);
              }}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`px-4 py-2 text-white rounded text-sm disabled:opacity-50 ${saved ? "bg-green-500" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <div className="px-5 py-3 bg-gray-50 border-b text-sm text-gray-600">
          {editingConn ? (
            <span>{editingConn.info.documentName ?? editingConn.info.fileName ?? "Connection"}</span>
          ) : provider === "onshape" ? (
            <span><strong>{selectedDoc?.name}</strong> › {selectedElement?.name}</span>
          ) : (
            <span><strong>{selectedFile?.attributes.name}</strong></span>
          )}
        </div>

        <div className="p-5">
          <p className="text-xs text-gray-500 mb-3">
            Map CadWolf solver variables to CAD parameter names. These will be pushed to the CAD model on every solve.
          </p>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500">CadWolf Variable</span>
            <span className="text-xs font-medium text-gray-500">CAD Parameter Name</span>
            <span />
          </div>

          {equations.map((eq, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
              <select
                value={eq.varName}
                onChange={(e) => updateEquation(idx, "varName", e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="">— select variable —</option>
                {solverVariables.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="e.g. width"
                value={eq.cadParamName}
                onChange={(e) => updateEquation(idx, "cadParamName", e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              />
              <button onClick={() => removeEquationRow(idx)} className="text-red-400 hover:text-red-600 text-sm px-1">×</button>
            </div>
          ))}

          <button onClick={addEquationRow} className="text-blue-600 text-sm hover:underline mt-1">
            + Add row
          </button>
        </div>
      </CadModal>
    );
  }

  return null;
}
