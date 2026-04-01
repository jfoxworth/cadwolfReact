import { getValidToken } from "./cadAuth";

const APS_BASE = "https://developer.api.autodesk.com";

async function fusionFetch(path: string, options: RequestInit = {}) {
  const token = await getValidToken("fusion");
  const url = path.startsWith("http") ? path : `${APS_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fusion/APS API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Data Management API ───────────────────────────────────────────────────────

export interface FusionHub {
  id: string;
  attributes: { name: string; region: string };
}

export interface FusionProject {
  id: string;
  attributes: { name: string };
}

export interface FusionItem {
  id: string;
  type: string; // "items" | "folders"
  attributes: {
    name: string;
    extension?: { type?: string; data?: { storageType?: string } };
  };
}

export async function listHubs(): Promise<FusionHub[]> {
  const data = await fusionFetch("/project/v1/hubs");
  return data.data ?? [];
}

export async function listProjects(hubId: string): Promise<FusionProject[]> {
  const data = await fusionFetch(`/project/v1/hubs/${encodeURIComponent(hubId)}/projects`);
  return data.data ?? [];
}

export async function listFolderContents(
  projectId: string,
  folderId: string,
): Promise<FusionItem[]> {
  const data = await fusionFetch(
    `/data/v1/projects/${encodeURIComponent(projectId)}/folders/${encodeURIComponent(folderId)}/contents`,
  );
  return data.data ?? [];
}

/** Get the top-level folder id for a project (the "Project Files" root). */
export async function getProjectTopFolder(
  hubId: string,
  projectId: string,
): Promise<string | null> {
  const data = await fusionFetch(
    `/project/v1/hubs/${encodeURIComponent(hubId)}/projects/${encodeURIComponent(projectId)}/topFolders`,
  );
  const folders: FusionItem[] = data.data ?? [];
  // Prefer "Project Files" folder; fall back to first
  const pf = folders.find((f) => f.attributes.name === "Project Files") ?? folders[0];
  return pf?.id ?? null;
}

export async function getItemTip(
  projectId: string,
  itemId: string,
): Promise<{ id: string; urn: string } | null> {
  const data = await fusionFetch(
    `/data/v1/projects/${encodeURIComponent(projectId)}/items/${encodeURIComponent(itemId)}/tip`,
  );
  const tip = data.data;
  if (!tip) return null;
  const urn = tip.relationships?.storage?.meta?.link?.href as string | undefined;
  return { id: tip.id as string, urn: urn ?? "" };
}

// ── Physical Properties via Model Derivative API ──────────────────────────────

/** Returns normalized SI properties for the first body in a Fusion design. */
export async function getPhysicalProperties(urn: string): Promise<{
  mass: number;
  volume: number;
  area: number;
  density: number;
} | null> {
  const encoded = Buffer.from(urn).toString("base64url");
  try {
    const data = await fusionFetch(
      `/modelderivative/v2/designdata/${encoded}/metadata`,
    );
    const guids: Array<{ guid: string }> = data.data?.metadata ?? [];
    if (guids.length === 0) return null;
    const guid = guids[0].guid;

    const props = await fusionFetch(
      `/modelderivative/v2/designdata/${encoded}/metadata/${guid}/properties`,
    );

    // Find physical properties in the property collection
    const collection = props.data?.collection ?? [];
    for (const item of collection) {
      const physProps = item.properties?.["Physical"]?.["Material"];
      if (!physProps) continue;
      return {
        mass:    Number(item.properties?.["Physical"]?.["Mass"]?.["Mass"]?.value ?? 0),
        volume:  Number(item.properties?.["Physical"]?.["Volume"]?.["Volume"]?.value ?? 0),
        area:    Number(item.properties?.["Physical"]?.["Surface Area"]?.["Area"]?.value ?? 0),
        density: Number(item.properties?.["Physical"]?.["Density"]?.["Density"]?.value ?? 0),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Fusion Design Parameters (push) ──────────────────────────────────────────

export interface FusionParameter {
  name: string;
  value: string; // expression, e.g. "10 mm"
  unit?: string;
}

/**
 * Push parameter values to a Fusion 360 design version.
 * Uses the Fusion Data API (fusiondata 2022-04).
 */
export async function pushParametersToFusion(
  projectId: string,
  versionId: string,
  parameters: FusionParameter[],
): Promise<void> {
  // versionId from APS Data API is base64url-encoded URN; strip the urn: prefix path
  // The Fusion Data API uses a different project ID format (without "b." prefix)
  const cleanProjectId = projectId.replace(/^b\./, "");
  const body = {
    values: {
      parameterValues: parameters.map((p) => ({
        name: p.name,
        value: p.value,
      })),
    },
  };

  await fusionFetch(
    `https://developer.api.autodesk.com/fusiondata/2022-04/projects/${encodeURIComponent(cleanProjectId)}/versions/${encodeURIComponent(versionId)}/f3dDocument/parameters`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}
