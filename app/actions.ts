"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  INSTALL_MINUTES,
  OWNER,
  VISIT_MINUTES,
  WEEKDAY_NAMES,
  WORKWEEK,
  blocks,
  overlaps,
  teamNames,
  fromMin,
  toMin,
  worksOn,
  type Kind,
  installDates,
} from "@/lib/agenda";
import { INSTALL_DURATIONS, durationShort } from "@/lib/duration";
import { endSession, hashPassword, requireSession, startSession, verifyLogin } from "@/lib/auth";
import { addDays, dayLong, dayShort, isDay, isTime, todayNl } from "@/lib/dates";
import { DEFAULT_COMPANY, USE_SUPABASE } from "@/lib/defaults";
import { INSTALL_CHECKS, INSTALL_PIPE_OPTIONS, TECH_KEYS, TECH_OPTIONS } from "@/lib/dossier";
import { CALL_MINUTES, callSlots } from "@/lib/calls";
import { isValidAnswer, optionLabel, visibleQuestions } from "@/lib/intake/questions";
import { callId } from "@/lib/notifications";
import { applyValueChange, formatEur, generateInvoiceItems, generateQuoteItems, quoteTotal } from "@/lib/pricing/engine";
import { PRICE_GROUPS, fromDisplay, setPath } from "@/lib/pricing/fields";
import { DEFAULT_RULES, type FormQuestion } from "@/lib/pricing/rules";
import { cancelText, confirmText, whatsapp } from "@/lib/reminders";
import { STATUS_LABEL } from "@/lib/workflow";
import { MAIL_ENABLED, sendMail, siteOrigin } from "@/lib/mail";
import {
  createLead,
  deleteAgendaItem,
  getLead,
  getLeadByToken,
  getSettings,
  listAgendaItems,
  listLeads,
  nextInvoiceNumber,
  saveAgendaItem,
  saveLead,
  saveSettings,
  updateSettings,
} from "@/lib/store";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { onlyFiles, saveImages, validateImages } from "@/lib/uploads";
import { UNKNOWN, type AgendaItem, type InstallReport, type Lead, type LeadStatus, type QuoteItem, type RosterRequest } from "@/lib/types";

export type FormState = { error?: string; ok?: boolean } | undefined;

const stamp = () => new Date().toISOString();

async function owned(id: string, role: "owner" | "technician" = "owner") {
  const session = await requireSession(role);
  const lead = await getLead(id, session.company_id);
  if (!lead) throw new Error("Aanvraag niet gevonden");
  return { lead, session };
}

function move(lead: Lead, status: LeadStatus, text: string) {
  lead.status = status;
  lead.log.push({ at: stamp(), text });
}

function refresh(id: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${id}`);
  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/revenue");
  revalidatePath("/technician");
}

/** Alles wat de agenda bezet: afspraken, eigen items en dagen waarop iemand niet kan werken. */
async function allBlocks(companyId: string) {
  const [leads, items, settings] = await Promise.all([listLeads(companyId), listAgendaItems(companyId), getSettings(companyId)]);
  return blocks(leads, items, settings.team);
}

async function team(companyId: string) {
  return (await getSettings(companyId)).team;
}

/** Toont na een actie een korte bevestiging bovenaan de pagina (?notice=code). */
function done(id: string, notice: string, tab?: string): never {
  refresh(id);
  redirect(`/dashboard/${id}?${tab ? `tab=${tab}&` : ""}notice=${notice}`);
}

/* ---------- Inloggen ---------- */

const attempts = new Map<string, number[]>();

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  const key = `${ip}|${email}`;
  const recent = (attempts.get(key) ?? []).filter((t) => Date.now() - t < 10 * 60_000);
  if (recent.length >= 5) {
    return { error: "Te veel pogingen. Wacht 10 minuten en probeer het opnieuw." };
  }

  const user = await verifyLogin(email, password);
  if (!user) {
    attempts.set(key, [...recent, Date.now()]);
    return { error: "E-mailadres of wachtwoord klopt niet. Probeer het opnieuw." };
  }
  attempts.delete(key);
  await startSession(user);
  redirect(user.role === "owner" ? "/dashboard" : "/technician");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

/* ---------- Afspraken plannen (eigenaar) ---------- */

const PLANNABLE: Record<Kind, LeadStatus[]> = {
  visit: ["new", "visit_planned"],
  install: ["install_to_plan", "install_planned"],
};

export async function planAppointment(
  id: string,
  kind: Kind,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { lead, session } = await owned(id);
  if (!PLANNABLE[kind].includes(lead.status)) return { error: "Voor deze aanvraag kan nu geen afspraak worden ingepland." };

  const date = String(form.get("date") ?? "");
  const time = String(form.get("time_custom") ?? "") || String(form.get("time") ?? "");
  const technician = String(form.get("technician") ?? "");
  if (!isDay(date)) return { error: "Kies een datum." };
  if (date < todayNl()) return { error: "Die datum ligt in het verleden." };
  if (!isTime(time)) return { error: "Kies een tijd uit de lijst, of vul zelf een tijd in." };
  const roster = await team(session.company_id);
  if (!teamNames(roster).includes(technician)) return { error: "Kies een monteur." };
  if (!worksOn(roster, technician, date)) {
    return { error: `${technician} werkt volgens het rooster niet op ${WEEKDAY_NAMES[(new Date(`${date}T12:00:00`).getDay() + 6) % 7]}. Kies een andere dag of pas het rooster aan bij Instellingen.` };
  }

  const days = kind === "install" ? Number(form.get("days")) : 0;
  if (kind === "install" && !(INSTALL_DURATIONS as readonly number[]).includes(days)) return { error: "Kies hoe lang de installatie duurt." };

  const bs = await allBlocks(session.company_id);
  const length = kind === "install" ? (days === 0.5 ? 240 : INSTALL_MINUTES) : VISIT_MINUTES;
  const dates = kind === "install" ? installDates(date, Math.ceil(days)) : [date];
  for (const [i, d] of dates.entries()) {
    if (overlaps(bs, technician, d, i === 0 ? toMin(time) : toMin("08:00"), length, lead.id)) {
      return {
        error:
          i === 0
            ? `${technician} heeft op dat moment al een afspraak. Kies een andere tijd of monteur.`
            : `${technician} is op ${dayShort(d)} (dag ${i + 1} van de installatie) niet vrij. Kies een andere startdag of monteur.`,
      };
    }
    if (!worksOn(roster, technician, d)) return { error: `${technician} werkt niet op ${dayShort(d)} (dag ${i + 1} van de installatie).` };
  }

  const previous = kind === "visit" ? lead.appointment : lead.install_appointment;
  const changed = !!previous && !previous.declined_at;
  const appt = { date, time, technician, ...(kind === "install" ? { days } : {}) };
  if (kind === "visit") {
    lead.appointment = appt;
    move(lead, "visit_planned", `${changed ? "Bezoek verplaatst" : "Bezoek ingepland"} (${dayShort(date)} ${time}, ${technician})`);
  } else {
    lead.install_appointment = appt;
    move(lead, "install_planned", `${changed ? "Installatie verplaatst" : "Installatie ingepland"} (${dayShort(date)} ${time}, ${technician}, ${durationShort(days)})`);
  }
  // Staat mailen aan, dan krijgt de klant de bevestiging vanzelf. Anders stuurt de eigenaar hem met één tik.
  if (MAIL_ENABLED && lead.customer.email && (!changed || form.get("notify") === "on")) {
    const company = await getSettings(session.company_id);
    const mailed = await sendMail({
      to: lead.customer.email,
      subject: changed ? "Uw afspraak is gewijzigd" : "Uw afspraak is ingepland",
      intro: confirmText(lead, kind, appt, company.company_name).replace(/ Groet, .*$/, ""),
      button: "Bel ons bij vragen",
      url: `tel:${company.phone.replace(/\s/g, "")}`,
      from: company.company_name,
      replyTo: company.email,
    });
    if (mailed) lead.log.push({ at: stamp(), text: `Bevestiging van de afspraak gemaild naar ${lead.customer.email}` });
  }
  await saveLead(lead);
  // Bij een wijziging kan de eigenaar de klant direct een bericht sturen.
  if (changed && form.get("notify") === "on") done(id, "verplaatst", "afspraken");
  done(id, kind === "visit" ? "ingepland" : "installatie_ingepland", "afspraken");
}

/* ---------- Offerte ---------- */

export async function generateQuoteNow(id: string) {
  const { lead, session } = await owned(id);
  if (lead.status !== "visit_done") return;
  const { pricing } = await getSettings(session.company_id);
  lead.quote = { items: generateQuoteItems(lead, pricing), values: { ...lead.answers }, generated_at: stamp() };
  move(lead, "quote_review", "Conceptofferte gemaakt");
  await saveLead(lead);
  done(id, "concept", "offerte");
}

function parseItems(form: FormData): { items: QuoteItem[] } | { error: string } {
  const labels = form.getAll("label").map(String);
  const amounts = form.getAll("amount").map((v) => Number(String(v).replace(",", ".")));
  const qtys = form.getAll("qty").map((v) => Number(String(v).replace(",", ".")));
  const prices = form.getAll("price").map((v) => (String(v) === "" ? NaN : Number(v)));
  const units = form.getAll("unit").map((v) => String(v).trim().slice(0, 20));
  const items: QuoteItem[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i].trim();
    if (!label && !amounts[i]) continue;
    if (!label) return { error: `Regel ${i + 1} heeft geen omschrijving.` };
    if (!Number.isFinite(amounts[i])) return { error: `Regel ${i + 1} heeft geen geldig bedrag.` };
    // Een regel met een aantal: het bedrag is altijd aantal x prijs per eenheid.
    const counted = Number.isFinite(prices[i]) && prices[i] >= 0 && qtys[i] > 0;
    items.push({
      id: `i${i}${Date.now().toString(36)}`,
      label,
      amount: Math.round(counted ? qtys[i] * prices[i] : amounts[i]),
      ...(counted ? { qty: qtys[i], price: prices[i], ...(units[i] ? { unit: units[i] } : {}) } : {}),
    });
  }
  if (items.length === 0) return { error: "Er is minimaal één regel nodig." };
  return { items };
}

export async function saveQuote(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { lead } = await owned(id);
  if (!lead.quote) return { error: "Er is nog geen conceptofferte." };
  if (lead.status !== "quote_review") return { error: "Een verstuurde offerte kan niet meer worden aangepast." };
  const parsed = parseItems(form);
  if ("error" in parsed) return { error: parsed.error };

  lead.quote.items = parsed.items;
  lead.log.push({ at: stamp(), text: "Offerte aangepast" });
  await saveLead(lead);
  refresh(id);
  return { ok: true };
}

/**
 * Een andere waarde kiezen waarmee de offerte is berekend (bijvoorbeeld een grotere ruimte dan de klant opgaf).
 * Het prijsverschil komt op de installatieregel; eigen regels blijven staan.
 */
export async function changeQuoteValue(id: string, question: string, option: string) {
  const { lead, session } = await owned(id);
  if (lead.status !== "quote_review" || !lead.quote) return;
  const { pricing } = await getSettings(session.company_id);
  if (!isValidAnswer(pricing.form, question, option)) return;
  const before = lead.quote.values ?? lead.answers;
  if (before[question] === option) return;
  const next = { ...before, [question]: option };
  // Antwoorden op vervolgvragen die door deze keuze niet meer gelden, vervallen.
  const visible = new Set(visibleQuestions(pricing.form, next).map((q) => q.id));
  const after = Object.fromEntries(Object.entries(next).filter(([k]) => visible.has(k)));
  const totalBefore = quoteTotal(lead.quote.items);
  lead.quote.items = applyValueChange(lead.quote.items, before, after, pricing);
  lead.quote.values = after;
  const short = pricing.form.find((q) => q.id === question)?.short ?? question;
  const diff = quoteTotal(lead.quote.items) - totalBefore;
  lead.log.push({
    at: stamp(),
    text: `Offerte herberekend: ${short} van "${optionLabel(pricing.form, question, before[question])}" naar "${optionLabel(pricing.form, question, option)}" (${diff >= 0 ? "+" : "−"} ${Math.abs(diff)} euro)`,
  });
  await saveLead(lead);
  done(id, "herberekend", "offerte");
}

export async function approveAndSend(id: string) {
  const { lead, session } = await owned(id);
  if (lead.status !== "quote_review" || !lead.quote) return;
  lead.quote.reviewed_at = stamp();
  lead.quote.sent_at = stamp();
  lead.log.push({ at: lead.quote.reviewed_at, text: "Offerte gecontroleerd" });
  const total = quoteTotal(lead.quote.items);
  // Staat mailen aan, dan gaat de offerte direct naar de klant. Anders deelt de eigenaar de link zelf.
  let mailed = false;
  if (MAIL_ENABLED && lead.customer.email) {
    const company = await getSettings(session.company_id);
    mailed = await sendMail({
      to: lead.customer.email,
      subject: `Uw offerte van ${company.company_name}`,
      intro: `Hallo ${lead.customer.name.split(" ")[0]},\n\nHierbij de offerte voor uw installatie: ${formatEur(total)}. U kunt hem bekijken en direct online akkoord geven.`,
      button: "Offerte bekijken",
      url: `${await siteOrigin()}/offerte/${lead.token}`,
      from: company.company_name,
      replyTo: company.email,
    });
  }
  move(lead, "quote_sent", mailed ? `Offerte gemaild naar ${lead.customer.email} (${total} euro)` : `Offerte goedgekeurd en klaar om te delen met ${lead.customer.name} (${total} euro)`);
  await saveLead(lead);
  done(id, mailed ? "gemaild" : "verstuurd", "offerte");
}

/** Een aanvraag afsluiten die niet doorgaat (klant reageert niet, ziet ervan af, dubbel). Alleen zolang er nog geen factuur is. */
export async function closeLead(id: string, reason: string) {
  const { lead } = await owned(id);
  if (!["new", "visit_planned", "visit_done", "quote_review", "quote_sent", "install_to_plan", "install_planned"].includes(lead.status)) return;
  const why = reason.trim().slice(0, 60) || "Anders";
  // De stap waarin de aanvraag stond blijft in het logboek staan; daarmee kan hij later precies daar weer open.
  move(lead, "rejected", `Aanvraag afgesloten door de eigenaar: ${why} (was: ${STATUS_LABEL[lead.status]})`);
  await saveLead(lead);
  refresh(id);
  revalidateAgenda();
  redirect(`/dashboard/${id}?notice=afgesloten`);
}

/**
 * Een afgesloten aanvraag weer openen, bijvoorbeeld als de klant later toch terugbelt.
 * Hij komt terug in de stap waar hij stond. Een afspraak die inmiddels voorbij is vervalt: die plant u opnieuw in.
 * Had de klant de offerte afgewezen, dan gaat de offerte open om aan te passen.
 */
export async function reopenLead(id: string) {
  const { lead } = await owned(id);
  if (lead.status !== "rejected" || lead.invoice?.sent_at) return;
  const closed = [...lead.log].reverse().find((e) => e.text.startsWith("Aanvraag afgesloten door de eigenaar"));
  const label = closed?.text.match(/\(was: (.+)\)$/)?.[1];
  let status = (Object.entries(STATUS_LABEL).find(([, l]) => l === label)?.[0] as LeadStatus | undefined) ?? (lead.quote ? "quote_review" : "new");
  if (status === "rejected" || status === "completed" || status === "invoice_sent") status = lead.quote ? "quote_review" : "new";
  const today = todayNl();
  if (status === "visit_planned" && (!lead.appointment || lead.appointment.date < today)) {
    lead.appointment = undefined;
    status = "new";
  }
  if (status === "install_planned" && (!lead.install_appointment || lead.install_appointment.date < today)) {
    lead.install_appointment = undefined;
    status = "install_to_plan";
  }
  // Is het oude moment intussen aan een andere klant gegeven, dan vervalt de afspraak en plant u opnieuw in.
  const session = await requireSession("owner");
  const taken = await allBlocks(session.company_id);
  if (status === "visit_planned" && lead.appointment && overlaps(taken, lead.appointment.technician, lead.appointment.date, toMin(lead.appointment.time), VISIT_MINUTES, lead.id)) {
    lead.appointment = undefined;
    status = "new";
  }
  if (status === "install_planned" && lead.install_appointment && overlaps(taken, lead.install_appointment.technician, lead.install_appointment.date, toMin(lead.install_appointment.time), INSTALL_MINUTES, lead.id)) {
    lead.install_appointment = undefined;
    status = "install_to_plan";
  }
  // Afgewezen offerte: terug naar controleren, zodat hij aangepast en opnieuw gedeeld kan worden.
  if (!closed && lead.quote) {
    status = "quote_review";
    lead.quote.sent_at = undefined;
    lead.quote.decided_at = undefined;
    lead.quote.reviewed_at = undefined;
  }
  move(lead, status, `Aanvraag heropend door de eigenaar (verder bij: ${STATUS_LABEL[status]})`);
  await saveLead(lead);
  refresh(id);
  revalidateAgenda();
  redirect(`/dashboard/${id}?notice=heropend_aanvraag`);
}

/**
 * Een geplande afspraak annuleren vanuit de agenda. De aanvraag gaat terug naar "inplannen", zodat u een nieuw moment
 * kunt afspreken. Staat mailen aan, dan krijgt de klant direct bericht; anders krijgt u een WhatsApp-link terug.
 */
export async function cancelAppointment(id: string, kind: Kind): Promise<{ ok: boolean; mailed: boolean; share?: string; name?: string }> {
  const { lead, session } = await owned(id);
  const appt = kind === "visit" ? lead.appointment : lead.install_appointment;
  const planned = kind === "visit" ? lead.status === "visit_planned" : lead.status === "install_planned";
  if (!appt || !planned) return { ok: false, mailed: false };
  const company = await getSettings(session.company_id);
  const text = cancelText(lead, kind, appt, company.company_name);

  if (kind === "visit") lead.appointment = undefined;
  else lead.install_appointment = undefined;
  move(lead, kind === "visit" ? "new" : "install_to_plan", `${kind === "visit" ? "Bezoek" : "Installatie"} van ${dayShort(appt.date)} ${appt.time} geannuleerd door de eigenaar`);

  let mailed = false;
  if (MAIL_ENABLED && lead.customer.email) {
    mailed = await sendMail({
      to: lead.customer.email,
      subject: "Uw afspraak is geannuleerd",
      intro: text.replace(/ Groet, .*$/, ""),
      button: "Bel ons bij vragen",
      url: `tel:${company.phone.replace(/\s/g, "")}`,
      from: company.company_name,
      replyTo: company.email,
    });
    if (mailed) lead.log.push({ at: stamp(), text: `Annulering gemaild naar ${lead.customer.email}` });
  }
  await saveLead(lead);
  refresh(id);
  revalidateAgenda();
  return { ok: true, mailed, share: whatsapp(lead.customer.phone, text), name: lead.customer.name };
}

/** Legt vast dat de klant een herinnering voor zijn afspraak heeft gekregen. */
export async function markReminded(id: string, kind: Kind) {
  const { lead } = await owned(id);
  const appt = kind === "visit" ? lead.appointment : lead.install_appointment;
  if (!appt || appt.reminded_at) return;
  appt.reminded_at = stamp();
  lead.log.push({ at: appt.reminded_at, text: `Herinnering voor ${kind === "visit" ? "het bezoek" : "de installatie"} gestuurd naar de klant` });
  await saveLead(lead);
  revalidatePath("/dashboard");
}

/** Betaallink bij een verstuurde factuur zetten of weghalen. */
export async function savePayLink(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { lead } = await owned(id);
  if (!lead.invoice?.sent_at || lead.invoice.paid_at) return { error: "Een betaallink kan alleen bij een openstaande factuur." };
  const url = String(form.get("url") ?? "").trim().slice(0, 300);
  if (url) {
    let ok = false;
    try {
      ok = new URL(url).protocol === "https:";
    } catch {}
    if (!ok) return { error: "Plak de volledige link, beginnend met https://." };
  }
  lead.invoice.pay_url = url || undefined;
  lead.log.push({ at: stamp(), text: url ? "Betaallink bij de factuur gezet" : "Betaallink weggehaald" });
  await saveLead(lead);
  refresh(id);
  return { ok: true };
}

/** Klantgegevens verbeteren, bijvoorbeeld een typfout in het telefoonnummer of het adres. */
export async function saveCustomer(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { lead } = await owned(id);
  const get = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const name = get("name", 120);
  const phone = get("phone", 30);
  const email = get("email", 160);
  const street = get("street", 120);
  const postcode = get("postcode", 8).toUpperCase();
  const city = get("city", 80);
  const company = get("company", 120);
  if (name.length < 2) return { error: "Vul de naam in." };
  if (phone.replace(/\D/g, "").length < 9) return { error: "Vul een geldig telefoonnummer in." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Het e-mailadres klopt niet." };
  if (postcode && !/^[1-9]\d{3}\s?[A-Z]{2}$/.test(postcode)) return { error: "Vul een postcode in zoals 5141 AB." };
  lead.customer = { name, phone, email, street, postcode, city, ...(company ? { company } : {}) };
  lead.log.push({ at: stamp(), text: "Klantgegevens gewijzigd" });
  await saveLead(lead);
  refresh(id);
  return { ok: true };
}

/** De eigenaar zet zelf een aanvraag erin, bijvoorbeeld voor een klant die belt. Daarna direct door naar inplannen. */
export async function addLead(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireSession("owner");
  const get = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const name = get("name", 120);
  const phone = get("phone", 30);
  const email = get("email", 160);
  const postcode = get("postcode", 8).toUpperCase();
  const street = `${get("street", 100)} ${get("number", 12)}`.trim();
  const city = get("city", 80);
  const company = get("company", 120);
  if (name.length < 2) return { error: "Vul de naam van de klant in." };
  if (phone.replace(/\D/g, "").length < 9) return { error: "Vul een geldig telefoonnummer in." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Het e-mailadres klopt niet." };
  if (postcode && !/^[1-9]\d{3}\s?[A-Z]{2}$/.test(postcode)) return { error: "Vul een postcode in zoals 5141 AB, of laat hem leeg." };

  // Alleen de vragen die bij de antwoorden horen; wat niet is ingevuld telt als "weet ik niet".
  const { pricing } = await getSettings(session.company_id);
  const answers: Record<string, string> = {};
  for (const q of pricing.form) {
    if (q.showIf && !q.showIf.in.includes(answers[q.showIf.question] ?? "")) continue;
    const v = String(form.get(`a-${q.id}`) ?? UNKNOWN);
    answers[q.id] = isValidAnswer(pricing.form, q.id, v) ? v : UNKNOWN;
  }
  const lead = await createLead({ customer: { name, phone, email, postcode, street, city, ...(company ? { company } : {}) }, answers, photos: [], addedBy: "de eigenaar" }, session.company_id);
  const note = get("note", 1000);
  if (note) {
    lead.notes.push({ at: stamp(), by: session.name, text: note });
    await saveLead(lead);
  }
  refresh(lead.id);
  redirect(`/dashboard/${lead.id}?tab=afspraken&notice=toegevoegd`);
}

export async function setOutcome(id: string, outcome: "accepted" | "rejected") {
  const { lead } = await owned(id);
  if (lead.status !== "quote_sent") return;
  if (lead.quote) lead.quote.decided_at = stamp();
  if (outcome === "accepted") move(lead, "install_to_plan", "Offerte akkoord, installatie moet worden ingepland");
  else move(lead, "rejected", "Klant heeft de offerte afgewezen");
  await saveLead(lead);
  done(id, outcome === "accepted" ? "akkoord" : "afgewezen", outcome === "accepted" ? "afspraken" : undefined);
}

/**
 * Offerte opnieuw openen om aan te passen, bijvoorbeeld omdat de klant extra werk vraagt.
 * De vorige versie blijft bewaard; na het opnieuw versturen moet de klant opnieuw akkoord geven.
 */
export async function reopenQuote(id: string) {
  const { lead } = await owned(id);
  if (!lead.quote || !["quote_sent", "install_to_plan"].includes(lead.status)) return;
  const q = lead.quote;
  q.history = [...(q.history ?? []), { items: q.items, sent_at: q.sent_at, decided_at: q.decided_at, reopened_at: stamp() }];
  q.sent_at = undefined;
  q.decided_at = undefined;
  q.reviewed_at = undefined;
  move(lead, "quote_review", `Offerte heropend om aan te passen (versie ${q.history.length + 1}). De klant geeft na het versturen opnieuw akkoord.`);
  await saveLead(lead);
  done(id, "heropend", "offerte");
}

/** Alle meldingen als gelezen markeren. */
export async function markNotificationsSeen() {
  const session = await requireSession("owner");
  await updateSettings(session.company_id, (current) => ({ ...current, notifications_seen_at: stamp(), notifications_read: [] }));
  revalidatePath("/dashboard", "layout");
}

/** Eén melding openen: die is daarmee gelezen, en u gaat naar de aanvraag waar hij over gaat. */
export async function openNotification(id: string, href: string) {
  const session = await requireSession("owner");
  await updateSettings(session.company_id, (current) => {
    const read = current.notifications_read ?? [];
    return read.includes(id) ? null : { ...current, notifications_read: [...read, id].slice(-300) };
  });
  revalidatePath("/dashboard", "layout");
  redirect(href.startsWith("/dashboard/") ? href : "/dashboard/meldingen");
}

/** Vaste producten opslaan (Instellingen). */
export async function saveProducts(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireSession("owner");
  const labels = form.getAll("p_label").map((v) => String(v).trim().slice(0, 80));
  const amounts = form.getAll("p_amount").map((v) => Number(String(v).replace(",", ".")));
  const unitList = form.getAll("p_unit").map((v) => String(v).trim().slice(0, 20));
  const products = labels
    .map((label, i) => ({ label, amount: Math.round((amounts[i] ?? 0) * 100) / 100, ...(unitList[i] ? { unit: unitList[i] } : {}) }))
    .filter((p) => p.label);
  if (products.some((p) => !Number.isFinite(p.amount) || p.amount < 0)) return { error: "Vul bij elk product een geldig bedrag in." };
  const current = await getSettings(session.company_id);
  await saveSettings(session.company_id, { ...current, products: products.slice(0, 60) });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/* ---------- Factuur ---------- */

export async function saveInvoice(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { lead } = await owned(id);
  if (!lead.invoice || lead.status !== "install_done") return { error: "Deze factuur kan niet meer worden aangepast." };
  const parsed = parseItems(form);
  if ("error" in parsed) return { error: parsed.error };
  lead.invoice.items = parsed.items;
  lead.log.push({ at: stamp(), text: "Factuur aangepast" });
  await saveLead(lead);
  refresh(id);
  return { ok: true };
}

export async function sendInvoice(id: string) {
  const { lead, session } = await owned(id);
  if (lead.status !== "install_done" || !lead.invoice) return;
  const settings = await getSettings(session.company_id);
  lead.invoice.number = await nextInvoiceNumber(session.company_id);
  lead.invoice.sent_at = stamp();
  lead.invoice.due_date = addDays(todayNl(), settings.legal.payment_days);
  const total = quoteTotal(lead.invoice.items);
  let mailed = false;
  if (MAIL_ENABLED && lead.customer.email) {
    mailed = await sendMail({
      to: lead.customer.email,
      subject: `Factuur ${lead.invoice.number} van ${settings.company_name}`,
      intro: `Hallo ${lead.customer.name.split(" ")[0]},\n\nHierbij de factuur voor uw installatie: ${formatEur(total)}. Graag betalen vóór ${dayShort(lead.invoice.due_date)}.`,
      button: "Factuur bekijken",
      url: `${await siteOrigin()}/factuur/${lead.token}`,
      from: settings.company_name,
      replyTo: settings.email,
    });
  }
  move(lead, "invoice_sent", mailed ? `Factuur ${lead.invoice.number} gemaild naar ${lead.customer.email} (${total} euro)` : `Factuur ${lead.invoice.number} definitief gemaakt en klaar om te delen (${total} euro)`);
  await saveLead(lead);
  done(id, mailed ? "factuur_gemaild" : "factuur_verstuurd", "factuur");
}

export async function markPaid(id: string) {
  const { lead } = await owned(id);
  if (lead.status !== "invoice_sent" || !lead.invoice) return;
  lead.invoice.paid_at = stamp();
  move(lead, "completed", "Betaling ontvangen, aanvraag afgerond");
  await saveLead(lead);
  done(id, "betaald", "factuur");
}

/* ---------- Notities ---------- */

export async function addNote(id: string, _: FormState, form: FormData): Promise<FormState> {
  const { lead, session } = await owned(id);
  const text = String(form.get("text") ?? "").trim();
  if (!text) return { error: "Schrijf eerst een notitie." };
  if (text.length > 1000) return { error: "Een notitie mag maximaal 1000 tekens zijn." };
  lead.notes.push({ at: stamp(), by: session.name, text });
  lead.log.push({ at: stamp(), text: "Notitie toegevoegd" });
  await saveLead(lead);
  refresh(id);
  return { ok: true };
}

/* ---------- Klant: offertelink (geen login, geheime link) ---------- */


/** De klant geeft via de offertelink akkoord (naar "Installatie plannen") of niet (afgerond). De eigenaar plant zelf. */
export async function decideQuote(token: string, decision: "accepted" | "rejected") {
  const lead = await getLeadByToken(token);
  if (!lead || lead.status !== "quote_sent" || !lead.quote) return;
  lead.quote.decided_at = stamp();
  if (decision === "accepted") {
    move(lead, "install_to_plan", "Klant is akkoord via de offertelink, installatie plannen");
  } else {
    move(lead, "rejected", "Klant heeft de offerte afgewezen via de offertelink");
  }
  await saveLead(lead);
  refresh(lead.id);
  redirect(`/offerte/${token}`);
}

/* ---------- Instellingen ---------- */

export async function saveCompany(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireSession("owner");
  const company_name = String(form.get("company_name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  if (company_name.length < 2) return { error: "Vul de bedrijfsnaam in." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Vul een geldig e-mailadres in." };
  const current = await getSettings(session.company_id);
  await saveSettings(session.company_id, { ...current, company_name, phone, email });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveLegal(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireSession("owner");
  const address = String(form.get("address") ?? "").trim().slice(0, 200);
  const kvk = String(form.get("kvk") ?? "").replace(/\s/g, "");
  const btw = String(form.get("btw") ?? "").replace(/\s/g, "").toUpperCase();
  const iban = String(form.get("iban") ?? "").replace(/\s/g, "").toUpperCase();
  const days = Number(form.get("payment_days"));
  if (kvk && !/^\d{8}$/.test(kvk)) return { error: "Een KvK-nummer heeft 8 cijfers." };
  if (btw && !/^NL\d{9}B\d{2}$/.test(btw)) return { error: "Een btw-nummer ziet eruit als NL123456789B01." };
  if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return { error: "Controleer het IBAN, bijvoorbeeld NL91ABNA0417164300." };
  if (!Number.isInteger(days) || days < 1 || days > 60) return { error: "De betaaltermijn is tussen 1 en 60 dagen." };
  const current = await getSettings(session.company_id);
  await saveSettings(session.company_id, { ...current, legal: { address, kvk, btw, iban, payment_days: days } });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function savePricing(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireSession("owner");
  const current = await getSettings(session.company_id);
  let rules = current.pricing;
  for (const group of PRICE_GROUPS) {
    for (const field of group.fields) {
      const raw = String(form.get(field.path) ?? "").replace(",", ".").trim();
      const n = Number(raw);
      if (raw === "" || !Number.isFinite(n)) {
        return { error: `“${field.label}” is geen geldig getal.` };
      }
      if (field.unit === "pct" && (n < 0 || n > 300)) {
        return { error: `“${field.label}” moet tussen 0 en 300 liggen.` };
      }
      rules = setPath(rules, field.path, fromDisplay(field, n));
    }
  }
  if (rules.spreadLow >= rules.spreadHigh) {
    return { error: "De ondergrens moet lager zijn dan de bovengrens." };
  }
  await saveSettings(session.company_id, { ...current, pricing: rules });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/** Vragen van het klantformulier met per antwoord het bedrag opslaan (Instellingen). */
export async function saveForm(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireSession("owner");
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("payload") ?? "[]"));
  } catch {
    return { error: "Opslaan is niet gelukt. Ververs de pagina en probeer het opnieuw." };
  }
  if (!Array.isArray(raw) || raw.length === 0) return { error: "Er is minimaal één vraag nodig." };
  if (raw.length > 20) return { error: "Maximaal 20 vragen." };

  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const ident = (v: unknown) => (typeof v === "string" && /^[a-z0-9_]{1,24}$/i.test(v) ? v : "");
  const questions: FormQuestion[] = [];
  for (const [i, entry] of raw.entries()) {
    const q = entry as Record<string, unknown>;
    const id = ident(q.id);
    const title = text(q.title, 120);
    if (!id || questions.some((x) => x.id === id)) return { error: "Opslaan is niet gelukt. Ververs de pagina en probeer het opnieuw." };
    if (!title) return { error: `Vraag ${i + 1} heeft nog geen tekst.` };
    const list = Array.isArray(q.options) ? q.options : [];
    if (list.length < 1) return { error: `"${title}" heeft minimaal één antwoord nodig.` };
    if (list.length > 12) return { error: `"${title}" heeft te veel antwoorden (maximaal 12).` };
    const options: FormQuestion["options"] = [];
    for (const [j, o] of (list as Record<string, unknown>[]).entries()) {
      const oid = ident(o.id);
      const label = text(o.label, 60);
      const amount = Number(String(o.amount ?? "0").replace(",", ".").trim() || "0");
      const units = Number(String(o.units ?? "").trim() || "0");
      if (!oid || oid === UNKNOWN || options.some((x) => x.id === oid)) return { error: "Opslaan is niet gelukt. Ververs de pagina en probeer het opnieuw." };
      if (!label) return { error: `Antwoord ${j + 1} bij "${title}" heeft nog geen tekst.` };
      if (!Number.isFinite(amount) || Math.abs(amount) > 100_000) return { error: `"${label}" heeft geen geldig bedrag.` };
      if (!Number.isInteger(units) || units < 0 || units > 20) return { error: `"${label}" heeft geen geldig aantal units.` };
      const hint = text(o.hint, 60);
      options.push({ id: oid, label, amount: Math.round(amount), ...(hint ? { hint } : {}), ...(units > 0 ? { units } : {}) });
    }
    const help = text(q.help, 160);
    const cond = q.showIf as { question?: unknown; in?: unknown } | undefined;
    const showIf = cond && ident(cond.question) && Array.isArray(cond.in) ? { question: ident(cond.question), in: cond.in.map(ident).filter(Boolean) } : undefined;
    questions.push({ id, title, short: text(q.short, 30) || title.replace(/\?$/, "").slice(0, 30), ...(help ? { help } : {}), options, ...(showIf ? { showIf } : {}) });
  }
  // Een vervolgvraag moet na de vraag komen waar hij van afhangt, anders wordt hij nooit gesteld.
  for (const [i, q] of questions.entries()) {
    if (!q.showIf) continue;
    const parent = questions.findIndex((x) => x.id === q.showIf!.question);
    if (parent === -1) delete q.showIf;
    else if (parent > i) return { error: `"${q.title}" hoort bij "${questions[parent].title}" en moet daar onder staan.` };
  }

  const current = await getSettings(session.company_id);
  await saveSettings(session.company_id, { ...current, pricing: { ...current.pricing, form: questions } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/intake");
  return { ok: true };
}

export async function resetPricing(): Promise<void> {
  const session = await requireSession("owner");
  const current = await getSettings(session.company_id);
  await saveSettings(session.company_id, { ...current, pricing: DEFAULT_RULES });
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?notice=reset");
}

/* ---------- Demo-aanvraag (website) ---------- */

const demoHits = new Map<string, number[]>();

export async function requestDemo(_: FormState, form: FormData): Promise<FormState> {
  if (String(form.get("website") ?? "")) return { ok: true }; // honeypot
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  const recent = (demoHits.get(ip) ?? []).filter((t) => Date.now() - t < 60 * 60_000);
  if (recent.length >= 5) return { error: "Er zijn te veel aanvragen vanaf dit netwerk. Probeer het later opnieuw." };
  demoHits.set(ip, [...recent, Date.now()]);

  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const company = String(form.get("company") ?? "").trim().slice(0, 120);
  const email = String(form.get("email") ?? "").trim().slice(0, 160);
  const plan = String(form.get("plan") ?? "").slice(0, 20);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 30);
  const [date, time] = String(form.get("slot") ?? "").split("|");
  if (name.length < 2) return { error: "Vul uw naam in." };
  if (company.length < 2) return { error: "Vul de naam van uw bedrijf in." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Vul een geldig e-mailadres in." };
  if (phone.replace(/\D/g, "").length < 9) return { error: "Vul een telefoonnummer in waarop we u kunnen bellen." };
  if (form.get("consent") !== "on") return { error: "Geef toestemming om contact met u op te nemen." };

  // Het gekozen moment komt direct in de agenda van de eigenaar, tussen de andere afspraken.
  if (date || time) {
    if (!isDay(date) || !isTime(time)) return { error: "Kies een moment voor het gesprek." };
    const free = (await callSlots(DEFAULT_COMPANY)).find((d) => d.date === date)?.times.includes(time);
    if (!free) return { error: "Dat moment is net bezet. Kies een ander moment." };
    try {
      await saveAgendaItem({
        id: callId(),
        company_id: DEFAULT_COMPANY,
        kind: "item",
        // Het telefoonnummer staat in de titel, zodat het direct in de agenda te zien is.
        title: `Gesprek met ${name} (${company}), bel ${phone}`.slice(0, 80),
        date,
        start: time,
        end: fromMin(toMin(time) + CALL_MINUTES),
        who: OWNER,
        created_by: "Website",
        description: `${name} van ${company}. Bellen: ${phone}. E-mail: ${email}.${plan && plan !== "onbekend" ? ` Interesse: pakket ${plan}.` : ""}`,
      });
    } catch {
      return { error: "Het inplannen is niet gelukt. Probeer het opnieuw, of verstuur zonder moment: dan bellen wij u." };
    }
    revalidateAgenda();
  }

  if (USE_SUPABASE) {
    const { error } = await supabaseAdmin()
      .from("demo_requests")
      .insert({ name, company, email, plan, consent_at: stamp() });
    if (error) {
      console.error("[demo_requests]", error.message);
      return { error: "Versturen is niet gelukt. Probeer het later opnieuw." };
    }
    return { ok: true };
  }

  const file = path.join(process.cwd(), "data", "demo-requests.json");
  let list: unknown[] = [];
  try {
    list = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {}
  list.push({ at: stamp(), name, company, email, plan });
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(list, null, 2), "utf8");
  return { ok: true };
}

/** Vrije momenten voor een gesprek, voor het formulier op de website. */
export async function getCallSlots() {
  return (await callSlots(DEFAULT_COMPANY)).map((d) => ({ ...d, label: dayLong(d.date) }));
}

/* ---------- Monteur ---------- */

/** Alleen de monteur die op de afspraak staat mag deze afronden of afmelden. */
async function technicianLead(id: string) {
  const session = await requireSession();
  const lead = await getLead(id, session.company_id);
  if (!lead) return null;
  const kind: Kind | null =
    lead.status === "visit_planned" ? "visit" : lead.status === "install_planned" ? "install" : null;
  const appt = kind === "visit" ? lead.appointment : kind === "install" ? lead.install_appointment : undefined;
  if (!kind || !appt || appt.declined_at || appt.technician !== session.name) return null;
  return { lead, session, kind, appt };
}

export async function completeVisit(id: string, _: FormState, form: FormData): Promise<FormState> {
  const ctx = await technicianLead(id);
  if (!ctx || ctx.kind !== "visit") return { error: "Dit bezoek staat niet meer open." };
  const { lead, session } = ctx;

  for (const key of TECH_KEYS) {
    const v = String(form.get(key) ?? UNKNOWN);
    const valid = TECH_OPTIONS[key].options.some((o) => o.id === v);
    lead.check[key] = valid ? { value: v, source: "verified" } : { value: UNKNOWN, source: "unknown" };
  }
  const missing = TECH_KEYS.filter((k) => lead.check[k].source !== "verified");
  if (missing.length > 0 && form.get("confirm_incomplete") !== "on") {
    return { error: `${missing.length} punt(en) nog niet ingevuld. Vul ze in, of vink aan dat u zonder afrondt.` };
  }

  lead.check.notes = String(form.get("notes") ?? "").slice(0, 2000);

  const files = onlyFiles(form.getAll("photos"));
  const photoError = validateImages(files, lead.check.photos.length);
  if (photoError) return { error: photoError };
  lead.check.photos.push(...(await saveImages(files)));

  lead.check.completed_at = stamp();
  lead.log.push({ at: stamp(), text: `Bezoek afgerond door ${session.name}` });

  // De conceptofferte staat direct klaar: de eigenaar hoeft alleen te controleren.
  const { pricing } = await getSettings(session.company_id);
  lead.quote = { items: generateQuoteItems(lead, pricing), values: { ...lead.answers }, generated_at: stamp() };
  move(lead, "quote_review", "Conceptofferte gemaakt");
  await saveLead(lead);
  refresh(id);
  redirect(session.role === "owner" ? `/dashboard/${id}?tab=afspraken` : "/technician?done=1");
}

export async function completeInstall(id: string, _: FormState, form: FormData): Promise<FormState> {
  const ctx = await technicianLead(id);
  if (!ctx || ctx.kind !== "install") return { error: "Deze installatie staat niet meer open." };
  const { lead, session } = ctx;

  const asQuoted = String(form.get("as_quoted") ?? "");
  if (asQuoted !== "yes" && asQuoted !== "no") return { error: "Geef aan of de installatie is uitgevoerd volgens de offerte." };
  const units = String(form.get("units") ?? "").trim();
  if (!/^[1-9]\d?$/.test(units)) return { error: "Vul het aantal geplaatste units in (1 tot 99)." };
  const pipe = String(form.get("pipe_length") ?? "");
  if (!INSTALL_PIPE_OPTIONS.some((o) => o.id === pipe)) return { error: "Kies de werkelijke leidinglengte." };

  const checks: Record<string, boolean> = {};
  for (const c of INSTALL_CHECKS) checks[c.id] = form.get(c.id) === "on";
  const open = INSTALL_CHECKS.filter((c) => !checks[c.id]);
  if (open.length > 0 && form.get("confirm_incomplete") !== "on") {
    return { error: `${open.length} controlepunt(en) nog niet afgevinkt. Vink ze af, of bevestig dat u zonder afrondt.` };
  }

  const labels = form.getAll("extra_label").map(String);
  const amounts = form.getAll("extra_amount").map((v) => Number(String(v).replace(",", ".")));
  const extras: QuoteItem[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i].trim();
    if (!label && !amounts[i]) continue;
    if (!label) return { error: `Meerwerk ${i + 1} heeft geen omschrijving.` };
    if (!Number.isFinite(amounts[i]) || amounts[i] <= 0) return { error: `Meerwerk ${i + 1} heeft geen geldig bedrag.` };
    extras.push({ id: `x${i}${Date.now().toString(36)}`, label: label.slice(0, 120), amount: Math.round(amounts[i]) });
  }

  const files = onlyFiles(form.getAll("photos"));
  const photoError = validateImages(files, 0);
  if (photoError) return { error: photoError };

  const report: InstallReport = {
    as_quoted: asQuoted,
    units,
    pipe_length: pipe,
    checks,
    serials: String(form.get("serials") ?? "").trim().slice(0, 300),
    notes: String(form.get("notes") ?? "").trim().slice(0, 2000),
    photos: await saveImages(files),
    extras,
    completed_at: stamp(),
  };
  lead.install = report;
  lead.invoice = { items: generateInvoiceItems(lead), created_at: stamp() };
  lead.log.push({ at: stamp(), text: `Installatie afgerond door ${session.name}` });
  move(lead, "install_done", "Conceptfactuur gemaakt");
  await saveLead(lead);
  refresh(id);
  redirect(session.role === "owner" ? `/dashboard/${id}?tab=afspraken` : "/technician?done=2");
}

/** De monteur meldt dat hij op het ingeplande moment niet kan. De eigenaar ziet dit direct. */
export async function declineAppointment(id: string) {
  const ctx = await technicianLead(id);
  if (!ctx) redirect("/technician");
  const { lead, session, kind, appt } = ctx;
  appt.declined_at = stamp();
  lead.log.push({
    at: stamp(),
    text: `${session.name} kan niet op ${dayShort(appt.date)} ${appt.time} (${kind === "visit" ? "bezoek" : "installatie"})`,
  });
  await saveLead(lead);
  refresh(id);
  redirect(session.role === "owner" ? `/dashboard/${id}?tab=afspraken` : "/technician?declined=1");
}

/* ---------- Eigen agenda-items en niet beschikbaar ---------- */

/**
 * Een afspraak in de agenda zetten of wijzigen ("Overige"). Iedereen mag dit voor zichzelf doen, de eigenaar ook voor een
 * collega. Niet beschikbaar of ziek doorgeven kan alleen de eigenaar: monteurs regelen dat onderling met de eigenaar.
 */
export async function saveAgendaEntry(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireSession();
  const owner = session.role === "owner";
  const id = String(form.get("id") ?? "");
  const kind = form.get("kind") === "off" && owner ? "off" : "item";
  const date = String(form.get("date") ?? "");
  const dateTo = String(form.get("date_to") ?? "");
  const multi = isDay(String(form.get("date_to") ?? "")) && String(form.get("date_to")) > String(form.get("date") ?? "");
  const wholeDay = form.get("whole_day") === "on" || multi;
  const start = wholeDay ? "" : String(form.get("start") ?? "");
  const end = wholeDay ? "" : String(form.get("end") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 80);
  const description = String(form.get("description") ?? "").trim().slice(0, 500);
  const who = owner ? String(form.get("who") ?? "") : session.name;

  const roster = await team(session.company_id);
  if (!teamNames(roster).includes(who)) return { error: "Kies voor wie dit geldt." };
  if (!isDay(date)) return { error: "Kies een datum." };

  const existing = id ? (await listAgendaItems(session.company_id)).find((i) => i.id === id) : undefined;
  if (id && !existing) return { error: "Deze afspraak bestaat niet meer." };
  if (existing && !owner && existing.who !== session.name && existing.created_by !== session.name) {
    return { error: "U kunt alleen uw eigen afspraken wijzigen." };
  }
  if (!existing && date < todayNl()) return { error: "Die datum ligt in het verleden." };

  if (kind === "item" && !title) return { error: "Vul een titel in." };
  if (!wholeDay) {
    if (!isTime(start) || !isTime(end)) return { error: "Kies een begin- en eindtijd, of kies hele dag." };
    if (toMin(end) <= toMin(start)) return { error: "De eindtijd moet na de begintijd liggen." };
  }
  if (dateTo && (!isDay(dateTo) || dateTo < date)) return { error: "De einddatum moet op of na de begindatum liggen." };

  const item: AgendaItem = {
    id: existing?.id ?? crypto.randomUUID(),
    company_id: session.company_id,
    kind,
    title: title || "Niet beschikbaar",
    date,
    ...(dateTo && dateTo > date ? { date_to: dateTo } : {}),
    ...(start && end ? { start, end } : {}),
    ...(description && kind === "item" ? { description } : {}),
    who,
    created_by: existing?.created_by ?? session.name,
  };
  await saveAgendaItem(item);
  revalidateAgenda();
  return { ok: true };
}

function revalidateAgenda() {
  revalidatePath("/dashboard/agenda");
  revalidatePath("/technician/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/technician");
}

/** Wijst een bestaande afspraak toe aan een andere monteur (bijvoorbeeld als de eerste ziek is). Alleen de eigenaar. */
export async function reassignAppointment(id: string, kind: Kind, tech: string) {
  const { lead, session } = await owned(id);
  const appt = kind === "install" ? lead.install_appointment : lead.appointment;
  if (!appt) return;
  const roster = await team(session.company_id);
  if (!teamNames(roster).includes(tech) || !worksOn(roster, tech, appt.date)) return;
  const length = kind === "install" ? INSTALL_MINUTES : VISIT_MINUTES;
  if (overlaps(await allBlocks(session.company_id), tech, appt.date, toMin(appt.time), length, lead.id)) return;
  const from = appt.technician;
  appt.technician = tech;
  lead.log.push({ at: stamp(), text: `${kind === "install" ? "Installatie" : "Bezoek"} overgedragen van ${from} aan ${tech}` });
  await saveLead(lead);
  refresh(id);
  revalidateAgenda();
}

export async function removeAgendaItem(id: string) {
  const session = await requireSession();
  const items = await listAgendaItems(session.company_id);
  const item = items.find((i) => i.id === id);
  // Een monteur mag alleen zijn eigen afspraken verwijderen.
  if (!item || (session.role !== "owner" && item.who !== session.name && item.created_by !== session.name)) return;
  await deleteAgendaItem(id, session.company_id);
  revalidateAgenda();
}

/** Weekrooster en teamleden opslaan (Instellingen > Team). */
export async function saveTeam(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireSession("owner");
  const current = await getSettings(session.company_id);
  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  const members: (typeof current.team[number] & { remove: boolean })[] = [];
  for (const [i, m] of current.team.entries()) {
    const email = String(form.get(`email-${i}`) ?? "").trim().toLowerCase().slice(0, 160);
    const password = String(form.get(`pw-${i}`) ?? "");
    const phone = String(form.get(`phone-${i}`) ?? "").trim().slice(0, 30);
    if (m.name !== OWNER) {
      if (email && !emailOk(email)) return { error: `Het e-mailadres van ${m.name} klopt niet.` };
      if (password && password.length < 8) return { error: `Het wachtwoord van ${m.name} moet minstens 8 tekens zijn.` };
      if (password && !email) return { error: `Vul ook een e-mailadres in voor ${m.name}.` };
      if (email && !password && !m.pass) return { error: `Kies een wachtwoord voor ${m.name}, anders kan hij niet inloggen.` };
    }
    members.push({
      name: m.name,
      days: [0, 1, 2, 3, 4, 5, 6].filter((d) => form.get(`d-${i}-${d}`) === "on"),
      extra: m.extra,
      ...(phone ? { phone } : {}),
      // Een leeg e-mailadres haalt de login weg; een leeg wachtwoordveld laat het bestaande wachtwoord staan.
      ...(m.name !== OWNER && email ? { email, pass: password ? hashPassword(password) : m.pass } : {}),
      remove: form.get(`rm-${i}`) === "on",
    });
  }
  const kept = members.filter((m) => !m.remove || m.name === OWNER);

  const added = String(form.get("new_name") ?? "").trim().slice(0, 60);
  if (added) {
    if (kept.some((m) => m.name.toLowerCase() === added.toLowerCase())) return { error: `${added} staat al in het team.` };
    // Oproepkracht: geen vaste dagen, werkt alleen op dagen die hij opgeeft en die u goedkeurt.
    kept.push({ name: added, days: form.get("new_flex") === "on" ? [] : WORKWEEK, remove: false });
  }
  const emails = kept.map((m) => m.email).filter(Boolean);
  if (new Set(emails).size !== emails.length) return { error: "Twee monteurs hebben hetzelfde e-mailadres. Elk e-mailadres mag één keer voorkomen." };
  if (emails.some((e) => e === "eigenaar@demo.nl" || e === "monteur@demo.nl")) return { error: "Dat e-mailadres is al in gebruik. Kies een ander." };

  const team = kept.map(({ name, days, extra, phone, email, pass }) => ({ name, days, ...(extra?.length ? { extra } : {}), ...(phone ? { phone } : {}), ...(email && pass ? { email, pass } : {}) }));
  await updateSettings(session.company_id, (latest) => ({ ...latest, team }));
  revalidateAgenda();
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/* ---------- Betalingsherinnering ---------- */

/** Legt vast dat er een herinnering naar de klant is gestuurd. */
export async function logReminder(id: string) {
  const { lead } = await owned(id);
  if (lead.status !== "invoice_sent" || !lead.invoice) return;
  lead.invoice.reminders = [...(lead.invoice.reminders ?? []), stamp()];
  lead.log.push({ at: stamp(), text: `Betalingsherinnering ${lead.invoice.reminders.length} verstuurd` });
  await saveLead(lead);
  revalidatePath("/dashboard/revenue/openstaand");
  revalidatePath(`/dashboard/${id}`);
  redirect("/dashboard/revenue/openstaand?notice=herinnering");
}

/* ---------- Rooster: vrij vragen en dagen opgeven ---------- */

const OFF_REASONS = ["Vrij", "Verlof", "Ziek", "Anders"];

function revalidateRoster() {
  revalidateAgenda();
  revalidatePath("/dashboard/rooster");
  revalidatePath("/technician/rooster");
  revalidatePath("/dashboard", "layout");
}

/** Opeenvolgende dagen samenvoegen tot periodes, zodat een week vrij één regel in de agenda is. */
function ranges(dates: string[]): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  for (const d of [...dates].sort()) {
    const last = out[out.length - 1];
    if (last && addDays(last.to, 1) === d) last.to = d;
    else out.push({ from: d, to: d });
  }
  return out;
}

/**
 * De monteur vraagt vrij aan, of geeft dagen op waarop hij kan werken (handig bij wisselende dagen of een oproepcontract).
 * Er verandert pas iets in de agenda nadat de eigenaar het heeft goedgekeurd.
 */
export async function requestRoster(_: FormState, form: FormData): Promise<FormState> {
  const session = await requireSession();
  const kind = form.get("kind") === "work" ? "work" : "off";
  const today = todayNl();
  const dates = [...new Set(form.getAll("date").map(String))].filter((d) => isDay(d) && d >= today).sort();
  if (dates.length === 0) return { error: "Kies minstens één dag." };
  if (dates.length > 62) return { error: "Kies maximaal 62 dagen per aanvraag." };
  const reason = kind === "off" ? String(form.get("reason") ?? "Vrij") : undefined;
  if (kind === "off" && !OFF_REASONS.includes(reason!)) return { error: "Kies een reden." };
  const note = String(form.get("note") ?? "").trim().slice(0, 300);

  let added = false;
  await updateSettings(session.company_id, (current) => {
    const taken = new Set(current.roster.filter((r) => r.who === session.name && r.kind === kind && r.status === "pending").flatMap((r) => r.dates));
    const fresh = dates.filter((d) => !taken.has(d));
    added = fresh.length > 0;
    if (!added) return null;
    const request: RosterRequest = { id: crypto.randomUUID().slice(0, 8), who: session.name, kind, dates: fresh, ...(reason ? { reason } : {}), ...(note ? { note } : {}), status: "pending", created_at: stamp() };
    return { ...current, roster: [...current.roster, request].slice(-200) };
  });
  if (!added) return { error: "Voor deze dagen staat al een aanvraag open." };
  revalidateRoster();
  return { ok: true };
}

/** De monteur trekt een aanvraag in die nog niet is beoordeeld. */
export async function withdrawRoster(id: string) {
  const session = await requireSession();
  await updateSettings(session.company_id, (current) => {
    const roster = current.roster.filter((r) => !(r.id === id && r.who === session.name && r.status === "pending"));
    return roster.length === current.roster.length ? null : { ...current, roster };
  });
  revalidateRoster();
}

/** De eigenaar keurt een aanvraag goed of wijst hem af. Pas bij goedkeuring verandert de agenda. */
export async function decideRoster(id: string, decision: "approved" | "rejected") {
  const session = await requireSession("owner");
  const current = await getSettings(session.company_id);
  const request = current.roster.find((r) => r.id === id);
  if (!request || request.status !== "pending") return;

  const itemIds: string[] = [];
  if (decision === "approved" && request.kind === "off") {
    for (const r of ranges(request.dates)) {
      const itemId = crypto.randomUUID();
      itemIds.push(itemId);
      await saveAgendaItem({
        id: itemId,
        company_id: session.company_id,
        kind: "off",
        title: request.reason === "Anders" ? "Niet beschikbaar" : (request.reason ?? "Vrij"),
        date: r.from,
        ...(r.to > r.from ? { date_to: r.to } : {}),
        who: request.who,
        created_by: request.who,
      });
    }
  }
  const today = todayNl();
  await updateSettings(session.company_id, (latest) => ({
    ...latest,
    team:
      decision === "approved" && request.kind === "work"
        ? latest.team.map((m) => (m.name === request.who ? { ...m, extra: [...new Set([...(m.extra ?? []), ...request.dates])].filter((d) => d >= today).sort() } : m))
        : latest.team,
    roster: latest.roster.map((r) => (r.id === id ? { ...r, status: decision, decided_at: stamp(), ...(itemIds.length ? { item_ids: itemIds } : {}) } : r)),
  }));
  revalidateRoster();
}

/**
 * Met één klik in het rooster iemand voor een dag uit- of inroosteren (alleen de eigenaar).
 * Werkt iemand die dag: dan gaat hij eruit (een losse werkdag vervalt, een vaste dag wordt "niet beschikbaar").
 * Werkt iemand niet: dan komt hij erin (afmelding weg, of een losse werkdag erbij).
 */
export async function toggleRosterDay(who: string, date: string) {
  const session = await requireSession("owner");
  if (!isDay(date) || date < todayNl()) return;
  const current = await getSettings(session.company_id);
  const member = current.team.find((m) => m.name === who);
  if (!member) return;

  const items = await listAgendaItems(session.company_id);
  const off = items.find((i) => i.kind === "off" && i.who === who && i.date <= date && (i.date_to ?? i.date) >= date);
  const fixed = member.days.includes((new Date(`${date}T12:00:00`).getDay() + 6) % 7);
  const extra = !!member.extra?.includes(date);
  const setExtra = (list: string[]) =>
    updateSettings(session.company_id, (latest) => ({ ...latest, team: latest.team.map((m) => (m.name === who ? { ...m, extra: [...list].sort() } : m)) }));

  if (off) {
    // Weer inroosteren: de afmelding voor deze dag vervalt. Een periode wordt in twee stukken geknipt.
    const end = off.date_to ?? off.date;
    await deleteAgendaItem(off.id, session.company_id);
    if (off.date < date) {
      const to = addDays(date, -1);
      await saveAgendaItem({ ...off, id: crypto.randomUUID(), date_to: to > off.date ? to : undefined });
    }
    if (end > date) {
      const from = addDays(date, 1);
      await saveAgendaItem({ ...off, id: crypto.randomUUID(), date: from, date_to: end > from ? end : undefined });
    }
    if (!fixed && !extra) await setExtra([...(member.extra ?? []), date]);
  } else if (extra) {
    await setExtra((member.extra ?? []).filter((d) => d !== date));
  } else if (fixed) {
    await saveAgendaItem({ id: crypto.randomUUID(), company_id: session.company_id, kind: "off", title: "Niet beschikbaar", date, who, created_by: session.name });
  } else {
    await setExtra([...(member.extra ?? []), date]);
  }
  revalidateRoster();
}
