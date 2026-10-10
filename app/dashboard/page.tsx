import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RevenueChart } from "@/components/RevenueChart";
import { StatusBadge, btn } from "@/components/ui";
import { OWNER, bookings, conflicts, techLabel } from "@/lib/agenda";
import { requireSession } from "@/lib/auth";
import { PART_LABEL, addDays, dayLong, dayShort, todayNl } from "@/lib/dates";
import { daysSince, lastActivity } from "@/lib/metrics";
import { formatEur, formatRange, quoteTotal } from "@/lib/pricing/engine";
import { buckets, outstanding, paidInvoices, toInvoice } from "@/lib/revenue";
import { CALL_PREFIX } from "@/lib/notifications";
import { ReminderButton } from "@/components/lead/ReminderButton";
import { nextWorkday, reminderText, whatsapp } from "@/lib/reminders";
import { datesText } from "@/lib/roster";
import { getSettings, listAgendaItems, listLeads } from "@/lib/store";
import type { Lead, LeadStatus } from "@/lib/types";
import {
  PHASES,
  PHASE_OF,
  QUOTE_REMINDER_DAYS,
  STATUS_LABEL,
  STATUS_ORDER,
  isOpen,
  isOwnerTurn,
  nextAction,
  phaseColor,
  quoteWaitingDays,
} from "@/lib/workflow";

export const metadata: Metadata = { title: "Aanvragen" };
export const dynamic = "force-dynamic";

type Alert = { id: string; name: string; text: string; tab?: string };

/** Dingen die meteen aandacht vragen: afmeldingen, botsingen en offertes zonder akkoord. */
function alerts(leads: Lead[], clashes: ReturnType<typeof conflicts>): Alert[] {
  const out: Alert[] = [];
  for (const l of leads) {
    if (!isOpen(l)) continue;
    const a = l.status === "visit_planned" ? l.appointment : l.status === "install_planned" ? l.install_appointment : undefined;
    if (a?.declined_at) out.push({ id: l.id, name: l.customer.name, text: `${techLabel(a.technician)} kan niet op ${dayShort(a.date)} om ${a.time}.`, tab: "afspraken" });
    const waiting = quoteWaitingDays(l);
    if (waiting !== null && waiting >= QUOTE_REMINDER_DAYS)
      out.push({ id: l.id, name: l.customer.name, text: `Offerte staat al ${waiting} dagen open. Stuur een herinnering.`, tab: "offerte" });
  }
  for (const { booking: b } of clashes) {
    if (b.appt.declined_at) continue;
    out.push({ id: b.lead.id, name: b.lead.customer.name, text: `${techLabel(b.appt.technician)} is niet beschikbaar op ${dayShort(b.appt.date)}, maar heeft dan een afspraak.`, tab: "afspraken" });
  }
  return out;
}

/** Welke tab van het dossier hoort bij de volgende stap. */
function tabFor(s: LeadStatus) {
  if (s === "quote_review" || s === "quote_sent") return "offerte";
  if (s === "install_done" || s === "invoice_sent") return "factuur";
  if (s === "completed" || s === "rejected") return "overview";
  return "afspraken";
}

/** Het ene gegeven dat bij deze stap telt: het moment, hoe lang het al wacht, of tot wanneer. */
function moment(l: Lead): string {
  if (l.status === "visit_planned" && l.appointment) return `${dayShort(l.appointment.date)} om ${l.appointment.time} met ${techLabel(l.appointment.technician)}`;
  if (l.status === "install_planned" && l.install_appointment) return `${dayShort(l.install_appointment.date)} met ${techLabel(l.install_appointment.technician)}`;
  if (l.status === "new" && l.preferred) return `Klant wil ${dayShort(l.preferred.first.date)}, ${PART_LABEL[l.preferred.first.part]}`;
  if (l.status === "quote_sent") {
    const d = quoteWaitingDays(l) ?? 0;
    return d === 0 ? "Vandaag verstuurd" : `${d} ${d === 1 ? "dag" : "dagen"} geleden verstuurd`;
  }
  if (l.status === "invoice_sent" && l.invoice?.due_date) return `Te betalen vóór ${dayShort(l.invoice.due_date)}`;
  if (l.status === "completed" && l.invoice?.paid_at) return `Betaald op ${dayShort(l.invoice.paid_at.slice(0, 10))}`;
  return `Sinds ${dayShort(lastActivity(l).slice(0, 10))}`;
}

/** Wacht op klant of monteur: per stap in de volgorde van het proces, en binnen een stap wat het eerst aan de beurt is. */
const STEP_TITLE: Partial<Record<LeadStatus, string>> = {
  visit_planned: "Bezoek gepland",
  quote_sent: "Offerte bij de klant",
  install_planned: "Installatie gepland",
  invoice_sent: "Wacht op betaling",
};
function waitDate(l: Lead) {
  if (l.status === "visit_planned") return l.appointment?.date ?? "";
  if (l.status === "install_planned") return l.install_appointment?.date ?? "";
  if (l.status === "quote_sent") return l.quote?.sent_at ?? "";
  if (l.status === "invoice_sent") return l.invoice?.due_date ?? "";
  return l.created_at;
}
function byWaitingStep(a: Lead, b: Lead) {
  const step = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
  return step !== 0 ? step : waitDate(a).localeCompare(waitDate(b));
}

const amount = (l: Lead) =>
  l.invoice ? formatEur(quoteTotal(l.invoice.items)) : l.quote ? formatEur(quoteTotal(l.quote.items)) : formatRange(l.estimate);

/**
 * "Aan u" is gegroepeerd op soort werk, zodat u hetzelfde werk achter elkaar kunt doen:
 * eerst de klanten die u moet bellen, dan de offertes, dan de facturen.
 */
type Work = "bellen" | "offerte" | "factuur";
const WORK: { id: Work; title: string }[] = [
  { id: "bellen", title: "Klanten bellen" },
  { id: "offerte", title: "Offertes" },
  { id: "factuur", title: "Facturen" },
];
function workOf(l: Lead): Work {
  if (l.status === "visit_done" || l.status === "quote_review") return "offerte";
  if (l.status === "install_done") return "factuur";
  return "bellen";
}
/** Waarvoor u belt, of wat u met de offerte of factuur doet. */
function taskOf(l: Lead): string {
  switch (l.status) {
    case "new":
      return "Bezoek inplannen";
    case "install_to_plan":
      return "Installatie inplannen";
    case "visit_planned":
    case "install_planned":
      return "Nieuw moment inplannen";
    case "quote_sent":
      return "Herinneren aan de offerte";
    case "visit_done":
      return "Conceptofferte maken";
    case "quote_review":
      return "Offerte controleren";
    case "install_done":
      return "Factuur controleren";
    default:
      return nextAction(l);
  }
}

/** Zoveel rijen per groep staan er op een telefoon direct; de rest zit achter "Toon alle". */
const MOBILE_ROWS = 5;

type TableTab = "wacht" | "lopend" | "afgerond";
const TABS: { id: TableTab; label: string }[] = [
  { id: "wacht", label: "Wacht op klant of monteur" },
  { id: "lopend", label: "Alles wat loopt" },
  { id: "afgerond", label: "Afgerond" },
];

function Phone({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function greeting() {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Amsterdam" }));
  return h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const session = await requireSession("owner");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const today = todayNl();

  const [all, items, settings] = await Promise.all([listLeads(session.company_id), listAgendaItems(session.company_id), getSettings(session.company_id)]);
  const alertList = alerts(all, conflicts(all, items));

  // Kerncijfers
  const aanU = all.filter(isOwnerTurn).sort((a, b) => lastActivity(a).localeCompare(lastActivity(b)));
  const work = WORK.map((w) => ({ ...w, leads: aanU.filter((l) => workOf(l) === w.id) })).filter((w) => w.leads.length > 0);
  // Ook van u: roosteraanvragen van het team, en gesprekken die via de website zijn ingepland.
  const rosterOpen = settings.roster.filter((r) => r.status === "pending").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const calls = items
    .filter((i) => i.id.startsWith(CALL_PREFIX) && i.date >= today)
    .sort((a, b) => `${a.date}${a.start ?? ""}`.localeCompare(`${b.date}${b.start ?? ""}`))
    .map((i) => {
      const m = i.title.match(/^(.*), bel ([\d +()-]{9,})$/);
      return { id: i.id, date: i.date, time: i.start ?? "", title: m ? m[1] : i.title, phone: m ? m[2].trim() : "" };
    });
  const taskCount = aanU.length + rosterOpen.length;
  const quotesOut = all.filter((l) => l.status === "quote_sent" && l.quote);
  const quotesOutSum = quotesOut.reduce((sum, l) => sum + quoteTotal(l.quote!.items), 0);
  const toInvoiceCount = all.filter((l) => l.status === "install_done" && l.invoice).length;
  const months = buckets(paidInvoices(all), "month");
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const change = lastMonth && lastMonth.total > 0 ? Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100) : null;
  const open = outstanding(all);
  const openCount = all.filter((l) => l.status === "invoice_sent").length;
  const chart = months.slice(-6);
  const chartMax = Math.max(...chart.map((b) => b.total), 1);

  // Pijplijn: hoeveel lopende klussen per fase
  const active = all.filter(isOpen);
  const pipeline = PHASES.slice(0, 5).map((p) => ({ ...p, count: active.filter((l) => PHASE_OF[l.status] === p.id).length }));

  // Vandaag en daarna
  const todays = all
    .filter(isOpen)
    .flatMap((l) => {
      const out: { lead: Lead; kind: "Bezoek" | "Installatie"; date: string; time: string; tech: string }[] = [];
      if (l.status === "visit_planned" && l.appointment && !l.appointment.declined_at && l.appointment.date <= today)
        out.push({ lead: l, kind: "Bezoek", date: l.appointment.date, time: l.appointment.time, tech: l.appointment.technician });
      if (l.status === "install_planned" && l.install_appointment && !l.install_appointment.declined_at && l.install_appointment.date <= today)
        out.push({ lead: l, kind: "Installatie", date: l.install_appointment.date, time: l.install_appointment.time, tech: l.install_appointment.technician });
      return out;
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const dueToday = todays.filter((t) => t.date === today);
  // Klanten met een afspraak op de volgende werkdag: die krijgen een herinnering.
  const remindDay = nextWorkday(today);
  const toRemind = bookings(all)
    .filter((b) => !b.done && b.appt.date === remindDay && (!b.part || b.part.n === 1) && b.lead.status.endsWith("_planned"))
    .sort((a, b) => a.appt.time.localeCompare(b.appt.time));
  const phoneOf = (tech: string) => settings.team.find((m) => m.name === tech)?.phone;
  const overdue = todays.filter((t) => t.date < today);
  const upcoming = [
    ...bookings(all)
      .filter((b) => !b.done && b.lead.status !== "completed" && b.appt.date > today)
      .map((b) => ({ date: b.appt.date, time: b.appt.time, title: b.lead.customer.name, sub: `${b.kind === "visit" ? "Bezoek" : "Installatie"} in ${b.lead.customer.city}`, href: `/dashboard/${b.lead.id}?tab=afspraken` })),
    ...items
      .filter((i) => i.kind === "item" && i.date > today)
      .map((i) => ({ date: i.date, time: i.start ?? "00:00", title: i.title, sub: `Overige, ${techLabel(i.who)}`, href: `/dashboard/agenda?d=${i.date}` })),
  ]
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 2);
  const offToday = items.filter((i) => i.kind === "off" && i.date <= today && (i.date_to ?? i.date) >= today);

  // Alle aanvragen. Wat op u wacht staat al bovenaan; hier staat de rest, en zoeken gaat door alles heen.
  const matches = (l: Lead) =>
    !q || [l.customer.name, l.customer.postcode, l.customer.city, l.customer.email, l.customer.phone].join(" ").toLowerCase().includes(q);
  const inTab: Record<TableTab, Lead[]> = {
    wacht: all.filter((l) => isOpen(l) && !isOwnerTurn(l)).sort(byWaitingStep),
    lopend: all.filter(isOpen).sort(byWaitingStep),
    afgerond: all.filter((l) => !isOpen(l)).sort((a, b) => lastActivity(b).localeCompare(lastActivity(a))),
  };
  const tab: TableTab = TABS.find((t) => t.id === sp.filter)?.id ?? "wacht";
  const found = q ? [...inTab.lopend, ...inTab.afgerond].filter(matches) : [];
  const rows = q ? found : inTab[tab];
  const stepped = !q && tab !== "afgerond";

  const fasesCard = (
        <section aria-labelledby="pijplijn-title" className="order-3 min-w-0 rounded-2xl border border-line bg-surface p-5 lg:order-none">
          <h2 id="pijplijn-title" className="text-base font-semibold">Lopende klussen per fase</h2>
          <p className="mt-1 text-sm text-muted">{active.length} lopend</p>
          <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-background" aria-hidden="true">
            {pipeline.filter((p) => p.count > 0).map((p) => (
              <span key={p.id} className="h-full" style={{ flexGrow: p.count, background: p.color }} />
            ))}
          </div>
          <ul className="mt-5 space-y-2.5">
            {pipeline.map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                <span className="flex-1">{p.label}</span>
                <span className="tabular font-semibold">{p.count}</span>
              </li>
            ))}
          </ul>
        </section>
  );
  const omzetCard = (
          <section aria-labelledby="omzet-title" className="order-4 flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 lg:order-none">
            <div className="flex items-center justify-between gap-3">
              <h2 id="omzet-title" className="text-base font-semibold">Omzet per maand</h2>
              <Link href="/dashboard/revenue" className="text-sm font-medium text-brand-strong hover:underline">Alle cijfers</Link>
            </div>
            {/* De grafiek groeit mee als deze kaart de kolom opvult, zodat er geen leeg vlak onder staat. */}
            <div className="mt-2 flex-1">
              <RevenueChart series={chart} max={chartMax} />
            </div>
          </section>
  );

  /*
   * De twee kolommen even lang houden. "Aan u" is de ene dag lang en de andere dag kort; daarom schuiven de kaarten
   * met cijfers naar de kolom die het kortst is. De hoogtes zijn een schatting: het gaat om de verhouding.
   * Wat er dan nog aan verschil overblijft vult de laatste kaart van de korte kolom op, zodat er geen gat ontstaat.
   */
  const leftBase = 80 + work.length * 40 + aanU.length * 64 + (rosterOpen.length ? 40 + rosterOpen.length * 64 : 0) + (calls.length ? 40 + calls.length * 64 : 0);
  const rightBase = 120 + dueToday.length * 72 + (overdue.length ? 70 + overdue.length * 52 : 0) + (toRemind.length ? 60 + toRemind.length * 52 : 0) + (upcoming.length ? 40 + upcoming.length * 52 : 0);
  const FASES = 280;
  const OMZET = 470;
  const placeLeft = [
    { fases: false, omzet: false },
    { fases: true, omzet: false },
    { fases: false, omzet: true },
    { fases: true, omzet: true },
  ]
    .map((o) => ({ ...o, diff: Math.abs(leftBase + (o.fases ? FASES : 0) + (o.omzet ? OMZET : 0) - (rightBase + (o.fases ? 0 : FASES) + (o.omzet ? 0 : OMZET))) }))
    .sort((x, y) => x.diff - y.diff)[0];

  return (
    <AppShell session={session} wide>
      {/* Kop */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Werkly <span aria-hidden="true">›</span> <span className="font-medium text-foreground">Aanvragen</span>
          </p>
          <h1 className="display-md mt-1 text-4xl">{greeting()}</h1>
          <p className="mt-1 text-muted">
            {taskCount === 0 ? "Niets dat op u wacht." : `${taskCount} ${taskCount === 1 ? "taak wacht" : "taken wachten"} op u.`}{" "}
            {dueToday.length === 0 ? "Vandaag geen afspraken." : `Vandaag ${dueToday.length} ${dueToday.length === 1 ? "afspraak" : "afspraken"}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium first-letter:uppercase">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
            </svg>
            <span className="first-letter:uppercase">{dayLong(today)}</span>
          </span>
          <Link href="/dashboard/agenda" className={btn.secondary}>Agenda openen</Link>
          <Link href="/dashboard/nieuw" className={btn.primary}>
            <span aria-hidden="true" className="text-lg leading-none">+</span> Aanvraag toevoegen
          </Link>
        </div>
      </div>

      {/* Aandachtspunten, als er iets is */}
      {alertList.length > 0 && (
        <div className="mt-6 rounded-2xl border border-signal/60 bg-signal/15">
          <Link href={`/dashboard/${alertList[0].id}?tab=${alertList[0].tab ?? "overview"}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-signal/10">
            <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-signal text-xs font-bold text-petrol">!</span>
            <span className="min-w-0 flex-1">
              <strong>{alertList[0].name}:</strong> {alertList[0].text}
            </span>
            <span aria-hidden="true" className="text-muted">›</span>
          </Link>
          {alertList.length > 1 && (
            <details className="group border-t border-signal/40">
              <summary className="flex min-h-10 cursor-pointer list-none items-center px-4 text-sm font-medium text-petrol [&::-webkit-details-marker]:hidden">
                Nog {alertList.length - 1} {alertList.length === 2 ? "punt" : "punten"} die aandacht vragen
              </summary>
              <ul className="divide-y divide-signal/30 border-t border-signal/40">
                {alertList.slice(1).map((a, i) => (
                  <li key={a.id + i}>
                    <Link href={`/dashboard/${a.id}?tab=${a.tab ?? "overview"}`} className="block px-4 py-2.5 text-sm hover:bg-signal/10">
                      <strong>{a.name}:</strong> {a.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Cijfers: het geld dat onderweg is, van offerte tot betaald. Op de telefoon staan ze onder de taken. */}
      <div className="mt-6 flex flex-col gap-4">
      <div className="order-2 grid grid-cols-2 gap-3 sm:gap-4 lg:order-1 xl:grid-cols-4">
        <Kpi label="Offertes bij de klant" value={formatEur(quotesOutSum)} href="/dashboard?filter=wacht#lijst" note={`${quotesOut.length} ${quotesOut.length === 1 ? "wacht" : "wachten"} op akkoord`} />
        <Kpi label="Nog te factureren" value={formatEur(toInvoice(all))} href="/dashboard/revenue/te-factureren" note={`${toInvoiceCount} ${toInvoiceCount === 1 ? "klus klaar" : "klussen klaar"}`} />
        <Kpi label="Nog te ontvangen" value={formatEur(open)} href="/dashboard/revenue/openstaand" note={`${openCount} ${openCount === 1 ? "factuur" : "facturen"} open`} />
        <Kpi
          label="Omzet deze maand"
          value={formatEur(thisMonth.total)}
          href="/dashboard/revenue"
          badge={change === null ? undefined : { text: `${change > 0 ? "+" : ""}${change}%`, good: change >= 0 }}
          note="t.o.v. vorige maand"
        />
      </div>

      {/* Aan u (alles, per soort werk) met rechts vandaag en de fases */}
      <div className="order-1 flex flex-col gap-4 lg:order-2 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4 lg:[&>*:last-child]:flex-1">
        <section id="aan-u" aria-labelledby="aan-u-title" className="order-1 min-w-0 scroll-mt-24 rounded-2xl border border-line bg-surface lg:order-none">
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <h2 id="aan-u-title" className="text-base font-semibold">Aan u</h2>
            <span className="text-sm text-muted">{taskCount === 0 ? "" : `${taskCount} ${taskCount === 1 ? "taak" : "taken"}`}</span>
          </div>
          {taskCount === 0 && calls.length === 0 ? (
            <p className="px-5 pb-6 pt-3 text-muted">Niets dat op u wacht. Alles loopt.</p>
          ) : (
            <div className="mt-2 pb-2">
              {work.map((w) => (
                <div key={w.id}>
                  <GroupTitle title={w.title} count={w.leads.length} />
                  {/* Op de telefoon eerst vijf per groep, zodat "Vandaag" niet ver weg staat. Het vinkje hieronder klapt de rest uit. */}
                  <input type="checkbox" id={`meer-${w.id}`} className="peer sr-only" />
                  <ul className="divide-y divide-line peer-checked:*:flex">
                    {w.leads.map((l, i) => {
                      const days = daysSince(lastActivity(l));
                      return (
                        <li key={l.id} className={`flex items-center gap-2 pr-4 transition-colors duration-100 hover:bg-background ${i >= MOBILE_ROWS ? "max-sm:hidden" : ""}`}>
                          <Link href={`/dashboard/${l.id}?tab=${tabFor(l.status)}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5 active:bg-slate-100">
                            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: phaseColor(l.status) }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold">{l.customer.name}</span>
                              <span className="block truncate text-sm text-muted">
                                <span className="font-medium text-petrol">{taskOf(l)}</span>
                                <span className="hidden sm:inline"> · {l.customer.city}</span>
                              </span>
                              {/* Op de telefoon staat de wachttijd onder de taak, zodat de taak zelf niet wordt afgekapt. */}
                              <span className={`block text-xs sm:hidden ${days >= 3 ? "font-medium text-amber-800" : "text-muted"}`}>
                                {days === 0 ? "Sinds vandaag" : `Wacht ${days} ${days === 1 ? "dag" : "dagen"}`} · {l.customer.city}
                              </span>
                            </span>
                            <span className={`hidden shrink-0 text-right text-xs sm:block ${days >= 3 ? "font-medium text-amber-800" : "text-muted"}`}>
                              {days === 0 ? "Sinds vandaag" : `Wacht ${days} ${days === 1 ? "dag" : "dagen"}`}
                            </span>
                          </Link>
                          {w.id === "bellen" ? (
                            <a
                              href={`tel:${l.customer.phone.replace(/\s/g, "")}`}
                              aria-label={`Bel ${l.customer.name}, ${l.customer.phone}`}
                              title={l.customer.phone}
                              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-soft px-3 text-sm xl:w-[9.5rem] font-semibold text-brand-strong transition-[background-color,color,transform] duration-100 hover:bg-brand hover:text-white active:scale-[0.96]"
                            >
                              <Phone />
                              <span className="tabular hidden xl:inline">{l.customer.phone}</span>
                              <span className="xl:hidden">Bel</span>
                            </a>
                          ) : (
                            <span aria-hidden="true" className="px-1 text-muted">›</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {w.leads.length > MOBILE_ROWS && (
                    <label
                      htmlFor={`meer-${w.id}`}
                      className="mx-5 mb-1 mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line text-sm font-semibold text-brand-strong active:bg-background peer-checked:hidden peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand sm:hidden"
                    >
                      Toon alle {w.leads.length}
                    </label>
                  )}
                </div>
              ))}

              {rosterOpen.length > 0 && (
                <div>
                  <GroupTitle title="Rooster" count={rosterOpen.length} />
                  <ul className="divide-y divide-line">
                    {rosterOpen.map((r) => (
                      <li key={r.id}>
                        <Link href="/dashboard/rooster" className="flex items-center gap-3 px-5 py-3 transition-colors duration-100 hover:bg-background active:bg-slate-100">
                          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-signal" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{techLabel(r.who)}</span>
                            <span className="block truncate text-sm text-muted">
                              <span className="font-medium text-petrol">{r.kind === "off" ? `${r.reason ?? "Vrij"} aangevraagd` : "Kan werken"}</span> · {datesText(r.dates)}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-medium text-brand-strong">Beoordelen</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {calls.length > 0 && (
                <div>
                  <GroupTitle title="Gesprekken via de website" count={calls.length} />
                  <ul className="divide-y divide-line">
                    {calls.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 pr-4 transition-colors duration-100 hover:bg-background">
                        <Link href={`/dashboard/agenda?m=${c.date.slice(0, 7)}&d=${c.date}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-5 active:bg-slate-100">
                          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{c.title}</span>
                            <span className="block truncate text-sm text-muted">
                              <span className="font-medium text-petrol">{c.date === today ? "Vandaag" : dayShort(c.date)}</span>
                              {c.time && ` om ${c.time}`}
                            </span>
                          </span>
                        </Link>
                        {c.phone && (
                          <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} aria-label={`Bel ${c.phone}`} title={c.phone} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-soft px-3 text-sm xl:w-[9.5rem] font-semibold text-brand-strong transition-[background-color,color,transform] duration-100 hover:bg-brand hover:text-white active:scale-[0.96]">
                            <Phone />
                            <span className="tabular hidden xl:inline">{c.phone}</span>
                            <span className="xl:hidden">Bel</span>
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
          {placeLeft.fases && fasesCard}
          {placeLeft.omzet && omzetCard}
        </div>

        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4 lg:[&>*:last-child]:flex-1">
        <section aria-labelledby="today" className="order-2 min-w-0 rounded-2xl border border-line bg-surface p-5 lg:order-none">
          <div className="flex items-center justify-between gap-2">
            <h2 id="today" className="text-base font-semibold">Vandaag</h2>
            <span className="text-sm text-muted">{dueToday.length} {dueToday.length === 1 ? "afspraak" : "afspraken"}</span>
          </div>
          {offToday.length > 0 && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800">
              Niet beschikbaar: {offToday.map((i) => techLabel(i.who).replace(" (eigenaar)", "")).join(", ")}
            </p>
          )}
          {dueToday.length === 0 ? (
            <p className="mt-3 text-muted">Geen afspraken vandaag.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dueToday.map((t) => (
                <li key={t.lead.id + t.kind} className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <span className="tabular w-12 shrink-0 text-lg font-semibold">{t.time}</span>
                  <Link href={`/dashboard/${t.lead.id}?tab=afspraken`} className="min-w-0 flex-1 hover:text-brand-strong">
                    <span className="block truncate font-medium">{t.lead.customer.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {t.kind} met {techLabel(t.tech)}
                    </span>
                  </Link>
                  {t.tech === OWNER && (
                    <Link href={`/technician/${t.lead.id}`} className="inline-flex min-h-10 items-center rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-strong active:scale-[0.97]">
                      Afronden
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {overdue.length > 0 && (
            <>
              <p className="mt-5 text-sm font-medium text-amber-900">Nog af te ronden</p>
              <p className="text-xs text-muted">De afspraak is geweest, maar de monteur heeft hem nog niet afgerond.</p>
              <ul className="mt-2 space-y-1">
                {overdue.map((t) => (
                  <li key={t.lead.id + t.kind} className="flex items-center gap-2">
                    <Link href={`/dashboard/${t.lead.id}?tab=afspraken`} className="flex min-w-0 flex-1 items-baseline gap-3 rounded-lg px-1 py-1.5 hover:bg-background">
                      <span className="w-24 shrink-0 text-sm font-medium first-letter:uppercase">
                        {dayShort(t.date)}
                        <span className="tabular block text-xs font-normal text-muted">{t.time}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{t.lead.customer.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {t.kind} door {techLabel(t.tech)}
                        </span>
                      </span>
                    </Link>
                    {t.tech === OWNER && (
                      <Link href={`/technician/${t.lead.id}`} className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-brand-soft px-3 text-sm font-semibold text-brand-strong hover:bg-brand hover:text-white">
                        Afronden
                      </Link>
                    )}
                    {t.tech !== OWNER && phoneOf(t.tech) && (
                      <a href={`tel:${phoneOf(t.tech)!.replace(/\s/g, "")}`} title={phoneOf(t.tech)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-brand-soft px-3 text-sm font-semibold text-brand-strong hover:bg-brand hover:text-white">
                        <Phone /> Bel {t.tech.split(" ")[0]}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {toRemind.length > 0 && (
            <>
              <p className="mt-5 text-sm font-medium">
                Herinner uw klanten voor <span className="first-letter:uppercase">{remindDay === addDays(today, 1) ? "morgen" : dayShort(remindDay)}</span>
              </p>
              <p className="text-xs text-muted">Eén tik opent WhatsApp met het bericht al ingevuld.</p>
              <ul className="mt-2 space-y-1">
                {toRemind.map((b) => (
                  <li key={b.lead.id + b.kind} className="flex items-center gap-2">
                    <Link href={`/dashboard/${b.lead.id}?tab=afspraken`} className="flex min-w-0 flex-1 items-baseline gap-3 rounded-lg px-1 py-1.5 hover:bg-background">
                      <span className="tabular w-12 shrink-0 text-sm font-medium">{b.appt.time}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{b.lead.customer.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {b.kind === "visit" ? "Bezoek" : "Installatie"} in {b.lead.customer.city}
                        </span>
                      </span>
                    </Link>
                    <ReminderButton id={b.lead.id} kind={b.kind} done={!!b.appt.reminded_at} href={whatsapp(b.lead.customer.phone, reminderText(b.lead, b.kind, b.appt, settings.company_name))} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {upcoming.length > 0 && (
            <>
              <p className="mt-5 text-sm font-medium text-muted">Hierna</p>
              <ul className="mt-2 space-y-1">
                {upcoming.map((u) => (
                  <li key={u.href + u.date + u.time}>
                    <Link href={u.href} className="flex items-baseline gap-3 rounded-lg px-1 py-1.5 hover:bg-background">
                      <span className="w-24 shrink-0 text-sm font-medium first-letter:uppercase">
                        {dayShort(u.date)}
                        {u.time !== "00:00" && <span className="tabular block text-xs font-normal text-muted">{u.time}</span>}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{u.title}</span>
                        <span className="block truncate text-xs text-muted">{u.sub}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

          {!placeLeft.fases && fasesCard}
          {!placeLeft.omzet && omzetCard}
        </div>
      </div>
      </div>

      {/* Alle aanvragen */}
      <section id="lijst" aria-labelledby="lijst-title" className="mt-4 scroll-mt-24 rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <h2 id="lijst-title" className="text-base font-semibold">{q ? `Zoekresultaten voor "${q}"` : "Alle aanvragen"}</h2>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <nav aria-label="Aanvragen per groep" className="flex min-w-0 max-w-full overflow-x-auto rounded-xl bg-background p-1 ring-1 ring-inset ring-line [scrollbar-width:none]">
              {TABS.map((t) => {
                const on = !q && t.id === tab;
                return (
                  <Link
                    key={t.id}
                    href={`/dashboard?filter=${t.id}#lijst`}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors duration-100 ${
                      on ? "bg-surface text-foreground shadow-sm ring-1 ring-line" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    <span className="tabular text-xs text-muted">{inTab[t.id].length}</span>
                  </Link>
                );
              })}
            </nav>
            <form role="search" action="/dashboard#lijst" className="relative">
              <label htmlFor="q" className="sr-only">Zoek op naam, postcode of plaats</label>
              <input
                id="q"
                name="q"
                type="search"
                autoComplete="off"
                defaultValue={sp.q ?? ""}
                placeholder="Zoek naam of plaats"
                className="min-h-11 w-56 max-w-full rounded-xl border border-line bg-surface px-3 text-sm placeholder:text-slate-500 focus:border-brand"
              />
            </form>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="border-t border-line p-6">
            {q ? (
              <>
                <p className="font-medium">Geen aanvragen gevonden voor &ldquo;{q}&rdquo;.</p>
                <Link href="/dashboard#lijst" className={`${btn.secondary} mt-4`}>Zoekopdracht wissen</Link>
              </>
            ) : (
              <p className="text-muted">{tab === "wacht" ? "Niets dat op een klant of monteur wacht." : "Geen aanvragen in deze groep."}</p>
            )}
          </div>
        ) : (
          <>
            {q && (
              <p className="border-t border-line px-5 py-2 text-sm text-muted">
                {rows.length} gevonden, ook in afgeronde aanvragen.{" "}
                <Link href="/dashboard#lijst" className="font-medium text-brand-strong hover:underline">Zoekopdracht wissen</Link>
              </p>
            )}
            <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_8rem_1rem] gap-4 border-t border-line px-5 py-2 text-xs font-medium text-muted md:grid" aria-hidden="true">
              <span>Klant</span>
              <span>Fase</span>
              <span>Volgende stap</span>
              <span className="text-right">Bedrag</span>
              <span />
            </div>
            <ul className="divide-y divide-line border-t border-line">
              {rows.map((l, idx) => {
                const mine = isOwnerTurn(l);
                const newStep = stepped && (idx === 0 || rows[idx - 1].status !== l.status);
                return (
                  <li key={l.id}>
                    {newStep && (
                      <p className="flex items-center gap-2 bg-surface px-5 pb-1 pt-4 text-xs font-medium text-muted">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: phaseColor(l.status) }} />
                        {(tab === "wacht" && STEP_TITLE[l.status]) || STATUS_LABEL[l.status]}
                        <span className="tabular grid h-5 min-w-5 place-items-center rounded-md bg-background px-1 text-[11px] font-semibold text-foreground ring-1 ring-inset ring-line">
                          {rows.filter((x) => x.status === l.status).length}
                        </span>
                      </p>
                    )}
                    <Link
                      href={`/dashboard/${l.id}?tab=${tabFor(l.status)}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors duration-100 hover:bg-background active:bg-slate-100 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_8rem_1rem]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{l.customer.name}</span>
                        <span className="block truncate text-sm text-muted">{l.customer.city}</span>
                      </span>
                      <span className="justify-self-end md:justify-self-start">
                        <StatusBadge status={l.status} />
                      </span>
                      <span className="col-span-2 min-w-0 md:col-span-1">
                        <span className={`block truncate text-sm font-medium ${mine ? "text-petrol" : "text-muted"}`}>
                          {mine ? nextAction(l) : isOpen(l) ? `Wacht op ${l.status === "visit_planned" || l.status === "install_planned" ? "monteur" : "klant"}` : nextAction(l)}
                        </span>
                        <span className="block truncate text-xs text-muted">{moment(l)}</span>
                      </span>
                      <span className="tabular hidden text-right text-sm md:block">{amount(l)}</span>
                      <span aria-hidden="true" className="hidden text-muted md:block">›</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

    </AppShell>
  );
}

function GroupTitle({ title, count }: { title: string; count: number }) {
  return (
    <h3 className="flex items-center gap-2 px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
      {title}
      <span className="tabular grid h-5 min-w-5 place-items-center rounded-md bg-background px-1 text-[11px] text-foreground ring-1 ring-inset ring-line">{count}</span>
    </h3>
  );
}

function Kpi({
  label,
  value,
  href,
  note,
  badge,
}: {
  label: string;
  value: string;
  href: string;
  note: string;
  badge?: { text: string; good: boolean };
}) {
  return (
    <Link href={href} className="group flex min-w-0 flex-col justify-between rounded-2xl border border-line bg-surface p-4 sm:p-5 transition-[border-color,transform] duration-100 hover:border-brand/50 active:scale-[0.98]">
      <span className="flex items-center justify-between text-sm font-medium text-muted">
        {label}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">›</span>
      </span>
      <span className="tabular mt-2 truncate text-xl font-semibold tracking-tight sm:mt-4 sm:text-3xl">{value}</span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted sm:mt-3 sm:text-sm">
        {badge && (
          <span className={`tabular rounded-md px-1.5 py-0.5 text-xs font-semibold ${badge.good ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
            {badge.text}
          </span>
        )}
        {note}
      </span>
    </Link>
  );
}
