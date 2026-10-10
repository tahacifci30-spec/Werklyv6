import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { addDays, todayNl, workdaysFrom } from "./dates";
import {
  DEFAULT_COMPANY,
  defaultSettings,
  formatInvoiceNumber,
  mergeSettings,
  newToken,
} from "./defaults";
import type { AgendaItem, Lead, Settings } from "./types";
import { seed } from "./seed";
import { normalizeStatus } from "./workflow";

/**
 * Opslag in een JSON-bestand: draait zonder configuratie (ontwikkeling en demo).
 * Productie gebruikt store-supabase.ts; zie lib/store.ts voor de keuze.
 */
const inDays = (n: number) => addDays(todayNl(), n);

const FILE = path.join(process.cwd(), "data", "db.json");

type Db = { leads: Lead[]; settings: Record<string, Settings>; items: AgendaItem[] };

/** Vult ontbrekende velden aan en zet oude statussen om, zodat oudere opgeslagen data blijft werken. */
function normalize(l: Lead): Lead {
  return {
    ...l,
    status: normalizeStatus(l.status),
    customer: { ...l.customer, street: l.customer.street ?? "", city: l.customer.city ?? "" },
    token: l.token ?? newToken(),
    consent_at: l.consent_at ?? l.created_at,
    customer_photos: l.customer_photos ?? [],
    notes: l.notes ?? [],
  };
}

async function read(): Promise<Db> {
  try {
    const raw = JSON.parse(await fs.readFile(FILE, "utf8"));
    const db: Db = Array.isArray(raw) ? { leads: raw, settings: {}, items: [] } : raw;
    db.leads = db.leads.map(normalize);
    db.items = db.items ?? [];
    return db;
  } catch {
    const { leads, invoiceSeq } = seed();
    const days = workdaysFrom(inDays(1), 12);
    const initial: Db = {
      leads,
      settings: { [DEFAULT_COMPANY]: { ...defaultSettings(), invoice_seq: invoiceSeq } },
      items: [
        { id: "i1", company_id: DEFAULT_COMPANY, kind: "item", title: "Overleg leverancier", date: days[1], start: "12:00", end: "15:00", who: "Eigenaar", created_by: "Eigenaar" },
        { id: "i2", company_id: DEFAULT_COMPANY, kind: "off", title: "Vrij", date: days[9], date_to: days[9], who: "Sven Bakker", created_by: "Sven Bakker" },
      ],
    };
    await write(initial);
    return initial;
  }
}

async function write(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2), "utf8");
}

/* ---------- Aanvragen ---------- */

export async function listLeads(companyId: string): Promise<Lead[]> {
  return (await read()).leads
    .filter((l) => l.company_id === companyId)
    .sort((x, y) => y.created_at.localeCompare(x.created_at));
}

export async function getLead(id: string, companyId: string) {
  return (await read()).leads.find((l) => l.id === id && l.company_id === companyId) ?? null;
}

/** Publieke toegang via de geheime link. */
export async function getLeadByToken(token: string) {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  return (await read()).leads.find((l) => l.token === token) ?? null;
}

export async function saveLead(lead: Lead) {
  const db = await read();
  const i = db.leads.findIndex((l) => l.id === lead.id);
  if (i === -1) db.leads.push(lead);
  else db.leads[i] = lead;
  await write(db);
}

/* ---------- Instellingen ---------- */

export async function getSettings(companyId: string): Promise<Settings> {
  return mergeSettings((await read()).settings[companyId]);
}

export async function saveSettings(companyId: string, settings: Settings) {
  const db = await read();
  db.settings[companyId] = settings;
  await write(db);
}

/** Instellingen wijzigen op basis van de laatste opgeslagen versie. `change` geeft null terug als er niets hoeft te gebeuren. */
export async function updateSettings(companyId: string, change: (current: Settings) => Settings | null): Promise<Settings> {
  const db = await read();
  const current = mergeSettings(db.settings[companyId]);
  const next = change(current);
  if (!next) return current;
  db.settings[companyId] = next;
  await write(db);
  return next;
}

/** Geeft het volgende factuurnummer en slaat de teller op. */
export async function nextInvoiceNumber(companyId: string): Promise<string> {
  const db = await read();
  const s = mergeSettings(db.settings[companyId]);
  s.invoice_seq += 1;
  db.settings[companyId] = s;
  await write(db);
  return formatInvoiceNumber(new Date().getFullYear(), s.invoice_seq);
}

/* ---------- Eigen agenda-items en niet-beschikbaar ---------- */

export async function listAgendaItems(companyId: string): Promise<AgendaItem[]> {
  return (await read()).items.filter((i) => i.company_id === companyId);
}

export async function saveAgendaItem(item: AgendaItem) {
  const db = await read();
  const i = db.items.findIndex((x) => x.id === item.id);
  if (i === -1) db.items.push(item);
  else db.items[i] = item;
  await write(db);
}

export async function deleteAgendaItem(id: string, companyId: string) {
  const db = await read();
  db.items = db.items.filter((x) => !(x.id === id && x.company_id === companyId));
  await write(db);
}
