import "server-only";
import { formatInvoiceNumber, mergeSettings } from "./defaults";
import { supabaseAdmin } from "./supabase-admin";
import type { AgendaItem, Lead, Settings } from "./types";
import { normalizeStatus } from "./workflow";

type Row = {
  id: string;
  company_id: string;
  created_at: string;
  customer: Lead["customer"];
  answers: Lead["answers"];
  estimate: Lead["estimate"];
  status: string;
  preferred: Lead["preferred"] | null;
  install_preferred: Lead["install_preferred"] | null;
  appointment: Lead["appointment"] | null;
  install_appointment: Lead["install_appointment"] | null;
  tech_check: Lead["check"];
  quote: Lead["quote"] | null;
  install: Lead["install"] | null;
  invoice: Lead["invoice"] | null;
  token: string;
  consent_at: string;
  customer_photos: string[];
  notes: Lead["notes"];
  log: Lead["log"];
};

const fromRow = (r: Row): Lead => ({
  id: r.id,
  company_id: r.company_id,
  created_at: r.created_at,
  customer: r.customer,
  answers: r.answers,
  estimate: r.estimate,
  status: normalizeStatus(r.status),
  preferred: r.preferred ?? undefined,
  install_preferred: r.install_preferred ?? undefined,
  appointment: r.appointment ?? undefined,
  install_appointment: r.install_appointment ?? undefined,
  check: r.tech_check,
  quote: r.quote ?? undefined,
  install: r.install ?? undefined,
  invoice: r.invoice ?? undefined,
  token: r.token,
  consent_at: r.consent_at,
  customer_photos: r.customer_photos ?? [],
  notes: r.notes ?? [],
  log: r.log ?? [],
});

const toRow = (l: Lead): Row => ({
  id: l.id,
  company_id: l.company_id,
  created_at: l.created_at,
  customer: l.customer,
  answers: l.answers,
  estimate: l.estimate,
  status: l.status,
  preferred: l.preferred ?? null,
  install_preferred: l.install_preferred ?? null,
  appointment: l.appointment ?? null,
  install_appointment: l.install_appointment ?? null,
  tech_check: l.check,
  quote: l.quote ?? null,
  install: l.install ?? null,
  invoice: l.invoice ?? null,
  token: l.token,
  consent_at: l.consent_at,
  customer_photos: l.customer_photos,
  notes: l.notes,
  log: l.log,
});

function fail(action: string, error: { message: string }): never {
  console.error(`[supabase] ${action}:`, error.message);
  throw new Error(`Opslag mislukt (${action})`);
}

export async function listLeads(companyId: string): Promise<Lead[]> {
  const { data, error } = await supabaseAdmin()
    .from("requests")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) fail("listLeads", error);
  return (data as Row[]).map(fromRow);
}

export async function getLead(id: string, companyId: string): Promise<Lead | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabaseAdmin()
    .from("requests")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) fail("getLead", error);
  return data ? fromRow(data as Row) : null;
}

export async function getLeadByToken(token: string): Promise<Lead | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const { data, error } = await supabaseAdmin()
    .from("requests")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) fail("getLeadByToken", error);
  return data ? fromRow(data as Row) : null;
}

export async function saveLead(lead: Lead): Promise<void> {
  const { error } = await supabaseAdmin().from("requests").upsert(toRow(lead));
  if (error) fail("saveLead", error);
}

type SettingsRow = {
  company_name: string;
  phone: string;
  email: string;
  pricing: Settings["pricing"];
  details: { legal?: Settings["legal"]; invoice_seq?: number; team?: Settings["team"]; demo_seeded?: boolean; products?: Settings["products"]; notifications_seen_at?: string; notifications_read?: string[]; roster?: Settings["roster"] } | null;
};

const SETTINGS_COLUMNS = "company_name, phone, email, pricing, details, updated_at";

const settingsFromRow = (r: SettingsRow | null): Settings =>
  r
    ? mergeSettings({
        company_name: r.company_name,
        phone: r.phone,
        email: r.email,
        pricing: r.pricing,
        legal: r.details?.legal,
        invoice_seq: r.details?.invoice_seq,
        team: r.details?.team,
        demo_seeded: r.details?.demo_seeded,
        products: r.details?.products,
        notifications_seen_at: r.details?.notifications_seen_at,
        notifications_read: r.details?.notifications_read,
        roster: r.details?.roster,
      })
    : mergeSettings(null);

const settingsToRow = (companyId: string, s: Settings) => ({
  company_id: companyId,
  company_name: s.company_name,
  phone: s.phone,
  email: s.email,
  pricing: s.pricing,
  details: { legal: s.legal, invoice_seq: s.invoice_seq, team: s.team, demo_seeded: s.demo_seeded, products: s.products, notifications_seen_at: s.notifications_seen_at, notifications_read: s.notifications_read, roster: s.roster },
  updated_at: new Date().toISOString(),
});

async function readSettingsRow(companyId: string, action: string) {
  const { data, error } = await supabaseAdmin().from("company_settings").select(SETTINGS_COLUMNS).eq("company_id", companyId).maybeSingle();
  if (error) fail(action, error);
  return (data as (SettingsRow & { updated_at: string | null }) | null) ?? null;
}

export async function getSettings(companyId: string): Promise<Settings> {
  return settingsFromRow(await readSettingsRow(companyId, "getSettings"));
}

export async function saveSettings(companyId: string, s: Settings): Promise<void> {
  const { error } = await supabaseAdmin().from("company_settings").upsert(settingsToRow(companyId, s));
  if (error) fail("saveSettings", error);
}

/**
 * Instellingen veilig wijzigen: lees de laatste versie, pas hem aan en schrijf alleen als niemand er intussen aan zat.
 * Zat er wel iemand aan (bijvoorbeeld een monteur die net een roosteraanvraag indient), dan proberen we het opnieuw
 * met de nieuwe versie. Zo overschrijven twee gelijktijdige wijzigingen elkaar niet. `change` geeft null terug als er niets hoeft te gebeuren.
 */
export async function updateSettings(companyId: string, change: (current: Settings) => Settings | null): Promise<Settings> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await readSettingsRow(companyId, "updateSettings");
    const current = settingsFromRow(row);
    const next = change(current);
    if (!next) return current;
    if (!row) {
      await saveSettings(companyId, next);
      return next;
    }
    const query = supabaseAdmin().from("company_settings").update(settingsToRow(companyId, next)).eq("company_id", companyId);
    const { data, error } = await (row.updated_at ? query.eq("updated_at", row.updated_at) : query.is("updated_at", null)).select("company_id");
    if (error) fail("updateSettings", error);
    if (data && data.length > 0) return next;
  }
  fail("updateSettings", { message: "te veel gelijktijdige wijzigingen" });
}

/** Geeft het volgende factuurnummer. De teller gaat veilig omhoog, ook als twee facturen tegelijk worden verstuurd. */
export async function nextInvoiceNumber(companyId: string): Promise<string> {
  const s = await updateSettings(companyId, (current) => ({ ...current, invoice_seq: current.invoice_seq + 1 }));
  return formatInvoiceNumber(new Date().getFullYear(), s.invoice_seq);
}

/* ---------- Eigen agenda-items en niet-beschikbaar ---------- */

export async function listAgendaItems(companyId: string): Promise<AgendaItem[]> {
  const { data, error } = await supabaseAdmin().from("agenda_items").select("*").eq("company_id", companyId);
  if (error) fail("listAgendaItems", error);
  return (data ?? []) as AgendaItem[];
}

export async function saveAgendaItem(item: AgendaItem): Promise<void> {
  const { error } = await supabaseAdmin().from("agenda_items").upsert(item);
  if (!error) return;
  // Migratie 0005 (kolom "description") nog niet uitgevoerd: sla de afspraak dan op zonder beschrijving, zodat de agenda blijft werken.
  if (item.description && /description/.test(error.message)) {
    console.warn("[supabase] agenda_items mist de kolom description; voer migratie 0005 uit.");
    const { description: _dropped, ...rest } = item;
    void _dropped;
    const retry = await supabaseAdmin().from("agenda_items").upsert(rest);
    if (!retry.error) return;
    fail("saveAgendaItem", retry.error);
  }
  fail("saveAgendaItem", error);
}

export async function deleteAgendaItem(id: string, companyId: string): Promise<void> {
  const { error } = await supabaseAdmin().from("agenda_items").delete().eq("id", id).eq("company_id", companyId);
  if (error) fail("deleteAgendaItem", error);
}
