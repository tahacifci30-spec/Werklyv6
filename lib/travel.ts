/**
 * Schatting van de reistijd tussen twee adressen, op basis van de afstand in vogelvlucht.
 * Geen kaartdienst: de weg is gemiddeld zo'n 30% langer dan de rechte lijn en we rekenen met 50 km/u
 * (dorpen, stad en een stuk snelweg door elkaar), plus 5 minuten voor parkeren en aanbellen.
 * Het is een richtlijn voor het inplannen, geen navigatie.
 */
export type Point = { lat: number; lon: number };

/** Een afspraak van een monteur op een dag, met de plek. */
export type Stop = { start: number; end: number; label: string; city: string; point: Point | null; leadId: string };

/** monteur -> datum -> afspraken van die dag, op volgorde van tijd */
export type DayRoutes = Record<string, Record<string, Stop[]>>;

export function km(a: Point, b: Point) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h)) * 1.3;
}

/** Reistijd in minuten, afgerond op 5. Onbekende plek: null. */
export function travelMinutes(a: Point | null | undefined, b: Point | null | undefined): number | null {
  if (!a || !b) return null;
  const d = km(a, b);
  if (d < 0.3) return 0;
  return Math.max(5, Math.ceil(((d / 50) * 60 + 5) / 5) * 5);
}

export const travelKm = (a: Point | null | undefined, b: Point | null | undefined) => (a && b ? Math.round(km(a, b)) : null);
