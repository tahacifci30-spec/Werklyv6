/** Datumhulpjes zonder tijdzone-verrassingen: alles als "YYYY-MM-DD" op lokale middag. */

export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = (s: string) => new Date(`${s}T12:00:00`);

export const isDay = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseDay(s).getTime()) && ymd(parseDay(s)) === s;

export const isTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export function addDays(s: string, n: number) {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** Aantal dagen van `from` tot `to` (positief als `to` later is). */
export const daysBetween = (from: string, to: string) =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);

export const isWeekend = (s: string) => [0, 6].includes(parseDay(s).getDay());

/** De eerste `n` werkdagen vanaf `start` (inclusief). */
export function workdaysFrom(start: string, n: number): string[] {
  const out: string[] = [];
  let d = start;
  while (out.length < n) {
    if (!isWeekend(d)) out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

/** Vandaag in Nederland, ook als de server in een andere tijdzone draait. */
export const todayNl = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

export const dayShort = (s: string) =>
  parseDay(s).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
export const dayLong = (s: string) =>
  parseDay(s).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
export const monthLong = (s: string) =>
  parseDay(s).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

export const PART_LABEL = { morning: "ochtend", afternoon: "middag", any: "maakt niet uit" } as const;
