import "server-only";
import { KIND_LABEL, bookings, toMin } from "./agenda";
import { locate } from "./geo";
import type { DayRoutes, Stop } from "./travel";
import type { Lead } from "./types";

/**
 * Waar elke monteur op welke dag is: alle afspraken vanaf `from`, met de plek van de klant.
 * Het inplanscherm rekent hiermee de reistijd naar een nieuwe klant uit.
 */
export async function dayRoutes(leads: Lead[], from: string, excludeLeadId?: string): Promise<DayRoutes> {
  const list = bookings(leads).filter((b) => b.appt.date >= from && b.lead.id !== excludeLeadId && !b.done);
  const unique = [...new Map(list.map((b) => [b.lead.id, b.lead])).values()];
  const points = new Map(await Promise.all(unique.map(async (l) => [l.id, await locate(l.customer)] as const)));

  const out: DayRoutes = {};
  for (const b of list) {
    const start = toMin(b.appt.time);
    const length = b.kind === "install" ? (b.appt.days === 0.5 ? 240 : 480) : 90;
    const stop: Stop = {
      start,
      end: start + length,
      label: `${KIND_LABEL[b.kind]} bij ${b.lead.customer.name}`,
      city: b.lead.customer.city,
      point: points.get(b.lead.id) ?? null,
      leadId: b.lead.id,
    };
    ((out[b.appt.technician] ??= {})[b.appt.date] ??= []).push(stop);
  }
  for (const days of Object.values(out)) for (const stops of Object.values(days)) stops.sort((a, b) => a.start - b.start);
  return out;
}
