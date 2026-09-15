import type { SelectedGooglePlace } from "./types";

const LANDMARK_PLACE_TYPES = new Set([
  "establishment",
  "point_of_interest",
  "premise",
  "subpremise",
]);

/** Estates, cities, and counties are not working pins. */
export function isLandmarkPlaceTypes(
  types: readonly string[] | undefined,
): boolean {
  if (!types?.length) return false;
  return types.some((type) => LANDMARK_PLACE_TYPES.has(type));
}

export function parseGooglePlace(raw: unknown): SelectedGooglePlace | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const placeId = String(value.placeId ?? "").trim();
  const name = String(value.name ?? "").trim();
  const lat = Number(value.lat);
  const lng = Number(value.lng);
  if (!placeId || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {
    placeId,
    name,
    formattedAddress: String(value.formattedAddress ?? "").trim(),
    lat,
    lng,
    county: value.county ? String(value.county) : null,
    locality: value.locality ? String(value.locality) : null,
    neighborhood: value.neighborhood ? String(value.neighborhood) : null,
    sublocality: value.sublocality ? String(value.sublocality) : null,
    sublocalityLevel1: value.sublocalityLevel1
      ? String(value.sublocalityLevel1)
      : null,
    sublocalityLevel2: value.sublocalityLevel2
      ? String(value.sublocalityLevel2)
      : null,
    adminAreaLevel2: value.adminAreaLevel2
      ? String(value.adminAreaLevel2)
      : null,
  };
}

export function hasWorkingPlace(raw: unknown): boolean {
  return parseGooglePlace(raw) !== null;
}

export function deriveTownAreaFromPlace(place: SelectedGooglePlace): {
  town: string;
  area: string;
} {
  const county = (place.county ?? "")
    .replace(/\s+county$/i, "")
    .trim();
  const town =
    county ||
    (place.locality ?? "").trim() ||
    (place.adminAreaLevel2 ?? "").trim() ||
    "Kenya";
  const area =
    (place.neighborhood ?? "").trim() ||
    (place.sublocality ?? "").trim() ||
    (place.sublocalityLevel1 ?? "").trim() ||
    place.name;
  return { town, area };
}

export function formatWorkingPlaceUpdatedAgo(
  iso: string | null | undefined,
): string {
  if (!iso) return "Not updated yet";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Not updated yet";
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) {
    return minutes === 1 ? "Updated 1 minute ago" : `Updated ${minutes} minutes ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "Updated 1 hour ago" : `Updated ${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? "Updated 1 day ago" : `Updated ${days} days ago`;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function pinDistanceKm(
  customer: unknown,
  agentWorkingPlace: unknown,
): number | null {
  const a = parseGooglePlace(customer);
  const b = parseGooglePlace(agentWorkingPlace);
  if (!a || !b) return null;
  return Math.round(haversineKm(a, b) * 1000) / 1000;
}

/** Under 1 km → meters; otherwise one decimal km. */
export function formatDistanceKm(km: number): string {
  const n = Number(km);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1) {
    const meters = Math.round(n * 1000);
    return meters < 1 ? "< 1 m" : `${meters} m`;
  }
  const rounded = Math.round(n * 10) / 10;
  return `${rounded} km`;
}

export function formatDistanceFromYou(km: number): string {
  const label = formatDistanceKm(km);
  return label ? `About ${label} from you` : "";
}
