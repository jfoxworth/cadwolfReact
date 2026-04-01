import { getValidToken } from "./cadAuth";

const BASE = "https://cad.onshape.com/api/v6";

async function onshapeFetch(path: string, options: RequestInit = {}) {
  const token = await getValidToken("onshape");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Onshape API ${res.status}: ${text}`);
  }
  return res.json();
}

export interface OnshapeDocument {
  id: string;
  name: string;
  defaultWorkspace: { id: string };
}

export interface OnshapeElement {
  id: string;
  name: string;
  type: string; // "PARTSTUDIO", "ASSEMBLY", etc.
  thumbnailInfo?: {
    sizes: Array<{ size: string; href: string }>;
  };
}

export interface OnshapeFeature {
  featureId: string;
  name: string;
  featureType: string;
  parameters: Array<{
    parameterId: string;
    message?: {
      value?: string;
      expression?: string;
      units?: string;
    };
  }>;
}

export async function listDocuments(search?: string): Promise<OnshapeDocument[]> {
  const params = new URLSearchParams({ filter: "0", limit: "20" });
  if (search) params.set("q", search);
  const data = await onshapeFetch(`/documents?${params}`);
  return data.items ?? [];
}

export async function listElements(
  documentId: string,
  workspaceId: string,
  withThumbnails = false,
): Promise<OnshapeElement[]> {
  const qs = withThumbnails ? "?withThumbnails=true" : "";
  return onshapeFetch(`/documents/d/${documentId}/w/${workspaceId}/elements${qs}`);
}

export async function getFeatures(
  documentId: string,
  workspaceId: string,
  elementId: string,
): Promise<OnshapeFeature[]> {
  const data = await onshapeFetch(
    `/partstudios/d/${documentId}/w/${workspaceId}/e/${elementId}/features`,
  );
  return data.features ?? [];
}

export async function updateFeatures(
  documentId: string,
  workspaceId: string,
  elementId: string,
  features: OnshapeFeature[],
): Promise<void> {
  await onshapeFetch(
    `/partstudios/d/${documentId}/w/${workspaceId}/e/${elementId}/features`,
    {
      method: "POST",
      body: JSON.stringify({ features }),
    },
  );
}

export interface OnshapePart {
  partId: string;
  name: string;
}

export async function listParts(
  documentId: string,
  workspaceId: string,
  elementId: string,
): Promise<OnshapePart[]> {
  const data = await onshapeFetch(
    `/parts/d/${documentId}/w/${workspaceId}`,
  );
  const arr: Array<Record<string, unknown>> = Array.isArray(data)
    ? data
    : (data as { items?: unknown[] }).items ?? [];
  // Response includes all parts across all elements; filter to the requested element
  return arr
    .filter((p) => p.partId && p.elementId === elementId)
    .map((p) => ({ partId: p.partId as string, name: (p.name as string) || (p.partId as string) }));
}

export interface OnshapePartProperties {
  mass: number;       // kg
  volume: number;     // m³
  surface: number;    // m²
  weight: number;     // N (mass * 9.80665)
  density: number;    // kg/m³
  inertia: number[];          // 9-element row-major inertia tensor (kg·m²)
  principalInertia: number[]; // 3-element principal moments
  centroid: number[];         // [x, y, z] in metres
  principalAxes: number[];    // 9-element rotation matrix
}

/** Fetch mass properties for every part in a PartStudio. */
export async function getMassProperties(
  documentId: string,
  workspaceId: string,
  elementId: string,
): Promise<Record<string, OnshapePartProperties>> {
  const data = await onshapeFetch(
    `/partstudios/d/${documentId}/w/${workspaceId}/e/${elementId}/massproperties`,
  );

  const result: Record<string, OnshapePartProperties> = {};

  const bodies: Record<string, unknown[]> = data.bodies ?? {};
  for (const [partId, entries] of Object.entries(bodies)) {
    const e = (entries as Array<Record<string, unknown>>)[0];
    if (!e) continue;

    const mass   = (e.mass   as number[])?.[0] ?? 0;
    const volume = (e.volume as number[])?.[0] ?? 0;
    const area   = (e.periphery as number[])?.[0] ?? 0;
    const density = (e.density as number[])?.[0] ?? 0;

    const rawInertia = (e.inertia as number[][]) ?? [];
    // Onshape returns a 3×3 inertia matrix; flatten to 9 elements
    const inertia = rawInertia.flat ? rawInertia.flat() : (rawInertia as unknown as number[]);

    const pi = (e.principalInertia as number[]) ?? [];
    const centroid3 = (e.centroid as number[][]) ?? [];
    const centroid = centroid3.flat ? centroid3.flat() : (centroid3 as unknown as number[]);
    const pa = (e.principalAxes as number[][]) ?? [];
    const principalAxes = pa.flat ? pa.flat() : (pa as unknown as number[]);

    result[partId] = {
      mass,
      volume,
      surface: area,
      weight: mass * 9.80665,
      density,
      inertia,
      principalInertia: pi,
      centroid,
      principalAxes,
    };
  }

  return result;
}

/** Find `assignVariable` features and update their values from solverResults. */
export async function pushVariablesToOnshape(
  documentId: string,
  workspaceId: string,
  elementId: string,
  equations: Array<{ varName: string; cadParamName: string }>,
  solverResults: Record<string, { value: number | string; units?: string }>,
): Promise<void> {
  const features = await getFeatures(documentId, workspaceId, elementId);

  // Build a map: cadParamName → feature (looking for "assignVariable" features)
  const toUpdate: OnshapeFeature[] = [];

  for (const eq of equations) {
    const result = solverResults[eq.varName.toLowerCase()];
    if (result === undefined) continue;

    const feat = features.find(
      (f) =>
        f.featureType === "assignVariable" &&
        f.parameters.some(
          (p) => p.parameterId === "variableName" && p.message?.value === eq.cadParamName,
        ),
    );
    if (!feat) continue;

    // Clone feature and update BTMParameterQuantity value
    const updated = structuredClone(feat);
    const valueParam = updated.parameters.find((p) => p.parameterId === "value");
    if (valueParam?.message) {
      valueParam.message.expression = String(result.value);
    }
    toUpdate.push(updated);
  }

  if (toUpdate.length === 0) return;
  await updateFeatures(documentId, workspaceId, elementId, toUpdate);
}
