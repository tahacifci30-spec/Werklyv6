import { addDays, parseDay, todayNl, ymd } from "./dates";
import { quoteTotal } from "./pricing/engine";
import type { Lead } from "./types";

export type Period = "day" | "week" | "month" | "year";
export const PERIODS: { id: Period; label: string; current: string; unit: string }[] = [
  { id: "day", label: "Dag", current: "Vandaag", unit: "per dag, laatste 14 dagen" },
  { id: "week", label: "Week", current: "Deze week", unit: "per week, laatste 12 weken" },
  { id: "month", label: "Maand", current: "Deze maand", unit: "per maand, laatste 12 maanden" },
  { id: "year", label: "Jaar", current: "Dit jaar", unit: "per jaar, laatste 4 jaar" },
];

export type Bucket = { key: string; label: string; long: string; total: number; count: number };
export type Paid = { lead: Lead; total: number; day: string };

const tz = "Europe/Amsterdam";
const localDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: tz });

/** Betaalde facturen. Omzet telt pas mee zodra een factuur is betaald. */
export function paidInvoices(leads: Lead[]): Paid[] {
  return leads
    .filter((l) => l.invoice?.paid_at)
    .map((l) => ({ lead: l, total: quoteTotal(l.invoice!.items), day: localDay(l.invoice!.paid_at!) }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

/** Verstuurd maar nog niet betaald. */
export const outstanding = (leads: Lead[]) =>
  leads.filter((l) => l.status === "invoice_sent" && l.invoice).reduce((s, l) => s + quoteTotal(l.invoice!.items), 0);

/** Uitgevoerd maar nog niet gefactureerd. */
export const toInvoice = (leads: Lead[]) =>
  leads.filter((l) => l.status === "install_done" && l.invoice).reduce((s, l) => s + quoteTotal(l.invoice!.items), 0);

function mondayOf(day: string) {
  const d = parseDay(day);
  const shift = (d.getDay() + 6) % 7;
  return addDays(day, -shift);
}

function isoWeek(monday: string) {
  const d = parseDay(monday);
  d.setDate(d.getDate() + 3); // donderdag bepaalt het weeknummer
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const week1Monday = parseDay(mondayOf(ymd(jan4)));
  return 1 + Math.round((d.getTime() - week1Monday.getTime()) / (7 * 86_400_000));
}

function keyOf(day: string, period: Period) {
  if (period === "day") return day;
  if (period === "week") return mondayOf(day);
  if (period === "month") return day.slice(0, 7);
  return day.slice(0, 4);
}

/** De reeks periodes (oudste eerst) eindigend bij vandaag, met totalen uit de betaalde facturen. */
export function buckets(paid: Paid[], period: Period, today = todayNl()): Bucket[] {
  const keys: { key: string; label: string; long: string }[] = [];
  if (period === "day") {
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i);
      keys.push({
        key: d,
        label: String(parseDay(d).getDate()),
        long: parseDay(d).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }),
      });
    }
  } else if (period === "week") {
    const m0 = mondayOf(today);
    for (let i = 11; i >= 0; i--) {
      const m = addDays(m0, -7 * i);
      const wk = isoWeek(m);
      keys.push({ key: m, label: String(wk), long: `Week ${wk}, vanaf ${parseDay(m).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}` });
    }
  } else if (period === "month") {
    const [y, mo] = today.split("-").map(Number);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(y, mo - 1 - i, 1, 12);
      keys.push({
        key: ymd(d).slice(0, 7),
        label: d.toLocaleDateString("nl-NL", { month: "short" }).replace(".", ""),
        long: d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" }),
      });
    }
  } else {
    const y = Number(today.slice(0, 4));
    for (let i = 3; i >= 0; i--) keys.push({ key: String(y - i), label: String(y - i), long: String(y - i) });
  }
  const map = new Map(keys.map((k) => [k.key, { ...k, total: 0, count: 0 }]));
  for (const p of paid) {
    const b = map.get(keyOf(p.day, period));
    if (b) {
      b.total += p.total;
      b.count += 1;
    }
  }
  return keys.map((k) => map.get(k.key)!);
}
