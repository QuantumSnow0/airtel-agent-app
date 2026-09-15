import {
  OPERATIONAL_AREAS,
  type OperationalArea,
} from "../canonical-locations/operational-areas";

export type LatLngBoundsLiteral = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type PlaceForAreaResolve = {
  lat: number;
  lng: number;
  county: string | null;
};

/** Approximate county extents used to detect town from a landmark pin. */
export const OPERATIONAL_AREA_BOUNDS: Record<
  OperationalArea,
  LatLngBoundsLiteral
> = {
  Bungoma: { south: 0.42, west: 34.32, north: 0.95, east: 34.95 },
  Garissa: { south: -1.85, west: 38.5, north: 0.98, east: 41.58 },
  Kajiado: { south: -3.1, west: 35.95, north: -1.0, east: 37.96 },
  Kakamega: { south: 0.08, west: 34.38, north: 0.65, east: 35.15 },
  Kiambu: { south: -1.33, west: 36.52, north: -0.75, east: 37.5 },
  Kilifi: { south: -4.0, west: 39.18, north: -2.25, east: 40.3 },
  Kisii: { south: -0.95, west: 34.6, north: -0.5, east: 34.98 },
  Kisumu: { south: -0.3, west: 34.52, north: 0.12, east: 35.12 },
  Kwale: { south: -4.73, west: 38.42, north: -3.48, east: 39.68 },
  Machakos: { south: -1.95, west: 36.82, north: -0.76, east: 37.9 },
  Meru: { south: -0.38, west: 37.32, north: 0.55, east: 38.28 },
  Migori: { south: -1.48, west: 33.9, north: -0.6, east: 34.68 },
  Mombasa: { south: -4.12, west: 39.55, north: -3.93, east: 39.78 },
  Nairobi: { south: -1.445, west: 36.65, north: -1.16, east: 37.11 },
  Nakuru: { south: -1.18, west: 35.38, north: 0.25, east: 36.68 },
  Nyamira: { south: -0.84, west: 34.8, north: -0.46, east: 35.15 },
  "Tharaka-Nithi": { south: -0.48, west: 37.52, north: 0.08, east: 38.18 },
  "Trans Nzoia": { south: 0.76, west: 34.7, north: 1.3, east: 35.25 },
  "Uasin Gishu": { south: 0.2, west: 34.92, north: 0.88, east: 35.58 },
  "West Pokot": { south: 1.08, west: 34.72, north: 2.68, east: 35.78 },
};

function normalizeCountyName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+county$/i, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

export function countyNameMatchesArea(
  county: string | null | undefined,
  area: string,
): boolean {
  if (!county?.trim()) return false;
  return normalizeCountyName(county) === normalizeCountyName(area);
}

export function pointInBounds(
  lat: number,
  lng: number,
  bounds: LatLngBoundsLiteral,
): boolean {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

function boundsArea(bounds: LatLngBoundsLiteral): number {
  return (bounds.north - bounds.south) * (bounds.east - bounds.west);
}

/**
 * Which of the 20 operational areas a Google place sits in.
 * County wins; if county is missing, the pin's bounds are used.
 */
export function resolveOperationalAreaFromPlace(
  place: PlaceForAreaResolve,
): OperationalArea | null {
  if (place.county?.trim()) {
    const matched = OPERATIONAL_AREAS.find((area) =>
      countyNameMatchesArea(place.county, area),
    );
    return matched ?? null;
  }
  const hits = OPERATIONAL_AREAS.filter((area) =>
    pointInBounds(place.lat, place.lng, OPERATIONAL_AREA_BOUNDS[area]),
  );
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0];
  return [...hits].sort(
    (a, b) =>
      boundsArea(OPERATIONAL_AREA_BOUNDS[a]) -
      boundsArea(OPERATIONAL_AREA_BOUNDS[b]),
  )[0];
}
