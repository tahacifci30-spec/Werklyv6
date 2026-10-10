import type { Lead, LeadStatus } from "./types";

export const STATUS_ORDER: LeadStatus[] = [
  "new",
  "visit_planned",
  "visit_done",
  "quote_review",
  "quote_sent",
  "install_to_plan",
  "install_planned",
  "install_done",
  "invoice_sent",
  "completed",
  "rejected",
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Nieuw",
  visit_planned: "Bezoek gepland",
  visit_done: "Bezoek afgerond",
  quote_review: "Offerte controleren",
  quote_sent: "Offerte verstuurd",
  install_to_plan: "Installatie plannen",
  install_planned: "Installatie gepland",
  install_done: "Factuur opstellen",
  invoice_sent: "Wacht op betaling",
  completed: "Afgerond",
  rejected: "Afgesloten",
};

/** Tailwind-klassen per status (tekst + achtergrond, beide ≥ 4.5:1). */
export const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-sky-50 text-sky-800 ring-sky-200",
  visit_planned: "bg-violet-50 text-violet-800 ring-violet-200",
  visit_done: "bg-teal-50 text-teal-800 ring-teal-200",
  quote_review: "bg-rose-50 text-rose-800 ring-rose-200",
  quote_sent: "bg-blue-50 text-blue-800 ring-blue-200",
  install_to_plan: "bg-amber-50 text-amber-900 ring-amber-200",
  install_planned: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  install_done: "bg-orange-50 text-orange-900 ring-orange-200",
  invoice_sent: "bg-yellow-50 text-yellow-900 ring-yellow-300",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-slate-100 text-slate-700 ring-slate-300",
};

/** De volgende actie voor de eigenaar per status. */
export const NEXT_ACTION: Record<LeadStatus, string> = {
  new: "Klant bellen en bezoek inplannen",
  visit_planned: "Wacht op de monteur",
  visit_done: "Conceptofferte maken",
  quote_review: "Offerte controleren en delen",
  quote_sent: "Wacht op akkoord van de klant",
  install_to_plan: "Klant bellen en installatie inplannen",
  install_planned: "Wacht op de installatie",
  install_done: "Factuur controleren en delen",
  invoice_sent: "Wacht op betaling",
  completed: "Geen actie nodig",
  rejected: "Geen actie nodig",
};

/** De volgende actie, rekening houdend met afmeldingen van de monteur. */
export function nextAction(l: Lead): string {
  const declined =
    (l.status === "visit_planned" && l.appointment?.declined_at) ||
    (l.status === "install_planned" && l.install_appointment?.declined_at);
  if (declined) return "Nieuw moment inplannen";
  if (l.status === "quote_sent") {
    const waiting = quoteWaitingDays(l);
    if (waiting !== null && waiting >= QUOTE_REMINDER_DAYS) return "Klant herinneren aan de offerte";
  }
  return NEXT_ACTION[l.status];
}

/** Statussen waarin de eigenaar zelf aan zet is (voor "Wacht te lang" en het filter "Wacht op mij"). */
export const OWNER_TURN = new Set<LeadStatus>([
  "new",
  "visit_done",
  "quote_review",
  "quote_sent",
  "install_to_plan",
  "install_done",
  "invoice_sent",
]);

/** Oude statussen uit eerdere versies naar het huidige verloop. */
export function normalizeStatus(s: string): LeadStatus {
  switch (s) {
    case "in_progress":
    case "visit_to_plan":
      return "new";
    case "quote_preparing":
      return "quote_review";
    case "accepted":
      return "install_to_plan";
    default:
      return (STATUS_ORDER as string[]).includes(s) ? (s as LeadStatus) : "new";
  }
}

/** Groepering voor het blok "Acties voor vandaag". */
export type TodoKey =
  | "new"
  | "make_quote"
  | "review_quote"
  | "follow_up"
  | "plan_install"
  | "invoice"
  | "payment";

export const TODO_LABEL: Record<TodoKey, { one: string; many: string }> = {
  new: { one: "nieuwe aanvraag", many: "nieuwe aanvragen" },
  make_quote: { one: "offerte maken", many: "offertes maken" },
  review_quote: { one: "offerte controleren", many: "offertes controleren" },
  follow_up: { one: "offerte opvolgen", many: "offertes opvolgen" },
  plan_install: { one: "installatie plannen", many: "installaties plannen" },
  invoice: { one: "factuur versturen", many: "facturen versturen" },
  payment: { one: "betaling afwachten", many: "betalingen afwachten" },
};

export function todoKey(status: LeadStatus): TodoKey | null {
  switch (status) {
    case "new":
      return "new";
    case "visit_done":
      return "make_quote";
    case "quote_review":
      return "review_quote";
    case "quote_sent":
      return "follow_up";
    case "install_to_plan":
      return "plan_install";
    case "install_done":
      return "invoice";
    case "invoice_sent":
      return "payment";
    default:
      return null;
  }
}

export const isOpen = (lead: Lead) => lead.status !== "completed" && lead.status !== "rejected";

/** Heeft de klant de offerte geaccepteerd (of is de klus al verder)? */
export const isWon = (status: LeadStatus) =>
  ["install_to_plan", "install_planned", "install_done", "invoice_sent", "completed"].includes(status);

/** Gekleurde balk links van een aanvraag, passend bij de status. */
export const STATUS_BAR: Record<LeadStatus, string> = {
  new: "border-l-sky-500",
  visit_planned: "border-l-violet-500",
  visit_done: "border-l-teal-500",
  quote_review: "border-l-rose-500",
  quote_sent: "border-l-blue-500",
  install_to_plan: "border-l-amber-500",
  install_planned: "border-l-indigo-500",
  install_done: "border-l-orange-500",
  invoice_sent: "border-l-yellow-500",
  completed: "border-l-emerald-500",
  rejected: "border-l-slate-400",
};

/** De drie hoofdgroepen op het overzicht. */
export type GroupId = "open" | "bezig" | "afgerond";
export const GROUPS: { id: GroupId; label: string; hint: string; statuses: LeadStatus[] }[] = [
  { id: "open", label: "Open", hint: "Nieuw binnen", statuses: ["new"] },
  {
    id: "bezig",
    label: "Bezig",
    hint: "Onderweg naar de factuur",
    statuses: ["visit_planned", "visit_done", "quote_review", "quote_sent", "install_to_plan", "install_planned", "install_done", "invoice_sent"],
  },
  { id: "afgerond", label: "Afgerond", hint: "Betaald of afgewezen", statuses: ["completed", "rejected"] },
];

/** Na zoveel dagen zonder akkoord herinnert Werkly de eigenaar aan een verstuurde offerte. */
export const QUOTE_REMINDER_DAYS = 7;

/** Aantal dagen dat een verstuurde offerte al op akkoord wacht, of null. */
export function quoteWaitingDays(lead: Lead): number | null {
  if (lead.status !== "quote_sent" || !lead.quote?.sent_at) return null;
  return Math.floor((Date.now() - new Date(lead.quote.sent_at).getTime()) / 86_400_000);
}

/**
 * Vijf fases van de klus, dezelfde als de leiding op de website. Kleur loopt van signaalgeel (nieuw)
 * via teal naar petrol (factuur), zodat je aan de kleur ziet hoe ver een klus is.
 */
export type PhaseId = "aanvraag" | "bezoek" | "offerte" | "installatie" | "factuur" | "afgerond" | "afgewezen";
export const PHASES: { id: PhaseId; label: string; color: string }[] = [
  { id: "aanvraag", label: "Aanvraag", color: "#f5c542" },
  { id: "bezoek", label: "Bezoek", color: "#7cc4bb" },
  { id: "offerte", label: "Offerte", color: "#0f766e" },
  { id: "installatie", label: "Installatie", color: "#145450" },
  { id: "factuur", label: "Factuur", color: "#0b3d3a" },
  { id: "afgerond", label: "Afgerond", color: "#94a3b8" },
  { id: "afgewezen", label: "Afgesloten", color: "#cbd5e1" },
];
export const PHASE_OF: Record<LeadStatus, PhaseId> = {
  new: "aanvraag",
  visit_planned: "bezoek",
  visit_done: "bezoek",
  quote_review: "offerte",
  quote_sent: "offerte",
  install_to_plan: "installatie",
  install_planned: "installatie",
  install_done: "installatie",
  invoice_sent: "factuur",
  completed: "afgerond",
  rejected: "afgewezen",
};
export const phaseColor = (status: LeadStatus) => PHASES.find((p) => p.id === PHASE_OF[status])!.color;

/**
 * Is de eigenaar nu zelf aan zet? Dan staat de aanvraag bij "Aan u".
 * Anders wacht hij op de klant (akkoord, betaling) of op de monteur (bezoek, installatie).
 */
export function isOwnerTurn(l: Lead): boolean {
  const declined =
    (l.status === "visit_planned" && !!l.appointment?.declined_at) ||
    (l.status === "install_planned" && !!l.install_appointment?.declined_at);
  if (declined) return true;
  if (l.status === "quote_sent") return (quoteWaitingDays(l) ?? 0) >= QUOTE_REMINDER_DAYS;
  return ["new", "visit_done", "quote_review", "install_to_plan", "install_done"].includes(l.status);
}

/** Op wie wacht een aanvraag die niet bij de eigenaar ligt? */
export function waitingOn(l: Lead): "klant" | "monteur" | null {
  if (isOwnerTurn(l) || !isOpen(l)) return null;
  return l.status === "visit_planned" || l.status === "install_planned" ? "monteur" : "klant";
}
