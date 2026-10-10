import "server-only";
import { DEFAULT_COMPANY, USE_SUPABASE, emptyCheck, newToken } from "./defaults";
import { estimatePrice } from "./pricing/engine";
import { seed } from "./seed";
import * as file from "./store-file";
import * as supabase from "./store-supabase";
import type { Customer, Lead, Preferred } from "./types";

/**
 * Enige ingang voor opslag. Met SUPABASE_SERVICE_ROLE_KEY ingesteld gebruikt de app Supabase,
 * anders het lokale JSON-bestand. De rest van de app weet niet welke van de twee actief is.
 */
const impl = USE_SUPABASE ? supabase : file;

export { DEFAULT_COMPANY };
export const {
  getLead,
  getLeadByToken,
  saveLead,
  getSettings,
  saveSettings,
  updateSettings,
  nextInvoiceNumber,
  listAgendaItems,
  saveAgendaItem,
  deleteAgendaItem,
} = impl;

/**
 * Eenmalig: zet 50 voorbeeldklanten in alle fases in de omgeving, zodat overzicht en omzet meteen gevuld zijn.
 * Klanten die er al zijn (zelfde e-mailadres) worden overgeslagen. Daarna gebeurt dit nooit meer, ook niet als
 * u voorbeeldklanten verwijdert. Uitzetten kan met de omgevingsvariabele DEMO_DATA=off.
 */
const seeded = new Set<string>();
const seeding = new Map<string, Promise<void>>();

async function ensureDemoData(companyId: string) {
  if (process.env.DEMO_DATA === "off" || seeded.has(companyId)) return;
  let run = seeding.get(companyId);
  if (!run) {
    run = (async () => {
      const settings = await impl.getSettings(companyId);
      if (!settings.demo_seeded) {
        const { leads, invoiceSeq } = seed();
        const known = new Set((await impl.listLeads(companyId)).map((l) => l.customer.email));
        for (const l of leads) {
          if (known.has(l.customer.email)) continue;
          await impl.saveLead({ ...l, id: USE_SUPABASE ? crypto.randomUUID() : l.id, company_id: companyId });
        }
        const fresh = await impl.getSettings(companyId);
        await impl.saveSettings(companyId, { ...fresh, invoice_seq: Math.max(fresh.invoice_seq, invoiceSeq), demo_seeded: true });
      }
      seeded.add(companyId);
    })().finally(() => seeding.delete(companyId));
    seeding.set(companyId, run);
  }
  await run;
}

export async function listLeads(companyId: string): Promise<Lead[]> {
  await ensureDemoData(companyId);
  return impl.listLeads(companyId);
}

export async function createLead(
  input: { customer: Customer; answers: Record<string, string>; photos: string[]; preferred?: Preferred; addedBy?: string },
  companyId = DEFAULT_COMPANY,
): Promise<Lead> {
  const settings = await impl.getSettings(companyId);
  const now = new Date().toISOString();
  const photoLog = input.photos.length
    ? [{ at: now, text: `${input.photos.length} foto(s) meegestuurd door klant` }]
    : [];
  const lead: Lead = {
    id: crypto.randomUUID(),
    company_id: companyId,
    created_at: now,
    customer: input.customer,
    answers: input.answers,
    estimate: estimatePrice(input.answers, settings.pricing),
    status: "new",
    preferred: input.preferred,
    check: emptyCheck(),
    token: newToken(),
    consent_at: now,
    customer_photos: input.photos,
    notes: [],
    log: [
      { at: now, text: input.addedBy ? `Aanvraag toegevoegd door ${input.addedBy}` : "Klant heeft het formulier ingevuld" },
      ...photoLog,
      { at: now, text: "Prijsindicatie berekend" },
    ],
  };
  await impl.saveLead(lead);
  return lead;
}
