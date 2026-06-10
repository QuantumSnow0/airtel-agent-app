import raw from "../region.json";

export type SafaricomRegionClusterGroup = {
  region_name: string;
  clusters: string[];
};

/** Region → cluster lists (exact strings for the estates API). */
export const SAFARICOM_REGION_CLUSTERS = raw as SafaricomRegionClusterGroup[];
