import { SAFARICOM_ESTATES_API_BASE } from "../../constants/safaricomEstatesApi";

export type SafaricomEstateRow = {
  estate_id: number;
  estate_name: string;
  created_at?: string;
  latitude?: number;
  longitude?: number;
  region_name?: string | null;
  cluster_name?: string | null;
  contractor_name?: string | null;
  no_of_houses?: number | null;
  occupancy?: number | null;
  region_id?: number | null;
  available_for_sale?: boolean | null;
  cluster_id?: number | null;
};

type EstatesAllInRegionResponse = {
  data: SafaricomEstateRow[];
  total?: number;
  mode?: string;
};

/**
 * List all estates in a region + cluster (exact match on API — use labels from `region.json`).
 */
export async function fetchEstatesByRegionCluster(
  regionName: string,
  clusterName: string
): Promise<SafaricomEstateRow[]> {
  const base = SAFARICOM_ESTATES_API_BASE.replace(/\/$/, "");
  const params = new URLSearchParams({
    region_name: regionName.trim(),
    cluster_name: clusterName.trim(),
  });
  const url = `${base}/estates?${params.toString()}`;
  const res = await fetch(url);
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error("Invalid response from estates API");
  }
  if (!res.ok) {
    const err = body as { error?: string };
    throw new Error(err?.error || `Estates request failed (${res.status})`);
  }
  const json = body as EstatesAllInRegionResponse;
  if (!Array.isArray(json.data)) {
    return [];
  }
  return json.data;
}
