import "server-only";
import type { Point } from "./travel";

/**
 * Plaatsbepaling voor de reistijdschatting, via PDOK (gratis dienst van de overheid, geen sleutel nodig).
 * Een postcode geeft het nauwkeurigste punt; anders de woonplaats. Uitkomsten blijven in het geheugen van de server.
 */
const cache = new Map<string, Point | null>();
const BASE = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?rows=1&fl=centroide_ll";

async function lookup(query: string): Promise<Point | null> {
  try {
    const res = await fetch(`${BASE}&q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return null;
    const raw = (await res.json())?.response?.docs?.[0]?.centroide_ll as string | undefined;
    const m = raw?.match(/POINT\(([\d.]+) ([\d.]+)\)/);
    return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null;
  } catch {
    return null;
  }
}

export async function locate(place: { postcode?: string; city?: string }): Promise<Point | null> {
  const pc = (place.postcode ?? "").replace(/\s/g, "").toUpperCase();
  const city = (place.city ?? "").trim();
  const key = pc || city.toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  let point = /^[1-9]\d{3}[A-Z]{2}$/.test(pc) ? await lookup(`postcode:${pc}`) : null;
  if (!point && city) point = await lookup(`type:woonplaats AND woonplaatsnaam:"${city.replace(/"/g, "")}"`);
  // Alleen een gevonden plek onthouden: een storing van een seconde mag een adres niet voorgoed onvindbaar maken.
  if (point) cache.set(key, point);
  return point;
}

/** Het adres van het bedrijf (vrije tekst, bijvoorbeeld "Straat 1, 5611 AA Eindhoven"). */
export async function locateAddress(address: string): Promise<Point | null> {
  const pc = address.match(/[1-9]\d{3}\s?[A-Za-z]{2}/)?.[0];
  if (pc) return locate({ postcode: pc });
  const city = address.split(",").pop()?.trim();
  return city ? locate({ city }) : null;
}
