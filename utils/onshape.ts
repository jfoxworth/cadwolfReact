import { getValidToken } from "./cadAuth";

const BASE = "https://cad.onshape.com/api/v6";

export async function onshapeFetch(path: string, options: RequestInit = {}) {
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

// Onshape API v6 returns features flat (no type/typeName/message envelope)
export interface OnshapeFeatureParam {
  btType: string; // e.g. "BTMParameterString-149", "BTMParameterQuantity-147", "BTMParameterEnum-145"
  parameterId: string;
  nodeId?: string;
  value?: string | number;
  expression?: string;
  units?: string;
  isInteger?: boolean;
  enumName?: string;
}

export interface OnshapeFeature {
  btType: string; // "BTMFeature-134"
  featureId: string;
  featureType: string; // "assignVariable"
  name: string;
  namespace: string;
  nodeId: string;
  parameters: OnshapeFeatureParam[];
  suppressed: boolean;
  returnAfterSubfeatures: boolean;
  subFeatures: unknown[];
  suppressionState: unknown;
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

interface OnshapeFeatureList {
  features: OnshapeFeature[];
  serializationVersion: string;
  sourceMicroversion: string;
}

async function getFeatures(
  documentId: string,
  workspaceId: string,
  elementId: string,
): Promise<OnshapeFeatureList> {
  const data = await onshapeFetch(
    `/partstudios/d/${documentId}/w/${workspaceId}/e/${elementId}/features`,
  );
  return {
    features: data.features ?? [],
    serializationVersion: data.serializationVersion ?? "",
    sourceMicroversion: data.sourceMicroversion ?? "",
  };
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

/** Fetch mass properties for a single specific part. Returns the raw Onshape body object
 *  (preserving the [display, si] array structure) so callers can store it in legacy format
 *  and the transformer can read SI values at index 1.
 */
export async function getPartMassProperties(
  documentId: string,
  workspaceId: string,
  elementId: string,
  partId: string,
): Promise<Record<string, unknown> | null> {
  const data = await onshapeFetch(
    `/parts/d/${documentId}/w/${workspaceId}/e/${elementId}/partid/${encodeURIComponent(partId)}/massproperties`,
  );
  const bodies = data.bodies as Record<string, unknown> | undefined;
  if (!bodies) return null;
  const body = bodies[partId];
  if (!body) return null;
  // Onshape sometimes wraps the body in an array; unwrap if so
  return Array.isArray(body)
    ? ((body as Array<Record<string, unknown>>)[0] ?? null)
    : (body as Record<string, unknown>);
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

  const bodies: Record<string, unknown> = data.bodies ?? {};
  for (const [partId, bodyData] of Object.entries(bodies)) {
    // Onshape returns either an array of body objects or a single body object
    const e = Array.isArray(bodyData)
      ? (bodyData as Array<Record<string, unknown>>)[0]
      : bodyData as Record<string, unknown>;
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

/** Push equation values to Onshape assignVariable features.
 *  Mirrors SetCADVariables.php + PushCADVariables.php from the old Laravel system.
 */
export async function pushVariablesToOnshape(
  documentId: string,
  workspaceId: string,
  elementId: string,
  equations: Array<{ varName: string; cadParamName: string }>,
  solverResults: Record<string, { value: number | string; units?: string }>,
): Promise<void> {
  const { features, serializationVersion, sourceMicroversion } =
    await getFeatures(documentId, workspaceId, elementId);

  // Collect features to update
  const sendFeatures: OnshapeFeature[] = [];

  for (const eq of equations) {
    const resultEntry = Object.entries(solverResults).find(
      ([k]) => k.toLowerCase() === eq.varName.toLowerCase(),
    );
    const result = resultEntry?.[1];
    if (!result) continue;

    const val   = typeof result.value === "number" ? result.value : Number(result.value);
    const units = result.units ?? "";

    // Find the assignVariable feature whose BTMParameterString-149 value matches cadParamName
    const feat = features.find(
      (f) =>
        f.featureType === "assignVariable" &&
        f.parameters?.some(
          (p) =>
            p.btType.startsWith("BTMParameterString") &&
            String(p.value).toLowerCase() === eq.cadParamName.toLowerCase(),
        ),
    );
    if (!feat) continue;

    // Clone and update parameters
    const updated = structuredClone(feat);
    for (const param of updated.parameters) {
      if (param.btType.startsWith("BTMParameterQuantity")) {
        param.value      = val;
        param.units      = units;
        param.expression = units ? `${val} ${units}` : String(val);
        param.parameterId = "anyValue";
        param.isInteger  = !units;
      }
      if (param.btType.startsWith("BTMParameterEnum") && param.enumName === "VariableType") {
        param.value      = "ANY";
        param.parameterId = "variableType";
      }
    }
    sendFeatures.push(updated);
  }

  // POST each feature individually
  for (const feat of sendFeatures) {
    const body = {
      serializationVersion,
      sourceMicroversion,
      rejectMicroversionSkew: false,
      feature: feat,
    };

    await onshapeFetch(
      `/partstudios/d/${documentId}/w/${workspaceId}/e/${elementId}/features/featureid/${feat.featureId}`,
      { method: "POST", body: JSON.stringify(body) },
    );
  }
}
