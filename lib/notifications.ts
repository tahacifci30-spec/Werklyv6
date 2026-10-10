import type { AgendaItem, Lead, RosterRequest } from "./types";

/**
 * Meldingen voor de eigenaar: alles wat klanten en monteurs doen waar u iets mee moet.
 * Ze komen uit het logboek van de aanvragen, de roosteraanvragen van het team en gesprekken die via de website
 * zijn ingepland, dus er is geen aparte opslag nodig.
 */
export type NoticeKind = "nieuw" | "akkoord" | "afgewezen" | "moment" | "terugbellen" | "afgerond" | "afgemeld" | "rooster" | "gesprek";
export type Notice = { id: string; at: string; kind: NoticeKind; title: string; href: string };

const RULES: { test: (t: string) => boolean; kind: NoticeKind; tab: string; title: (name: string) => string }[] = [
  { test: (t) => t === "Klant heeft het formulier ingevuld", kind: "nieuw", tab: "afspraken", title: (n) => `Nieuwe aanvraag van ${n}: bel om het bezoek in te plannen` },
  { test: (t) => t.startsWith("Klant is akkoord"), kind: "akkoord", tab: "afspraken", title: (n) => `${n} is akkoord met de offerte: bel om de installatie in te plannen` },
  { test: (t) => t.startsWith("Klant heeft de offerte afgewezen"), kind: "afgewezen", tab: "offerte", title: (n) => `${n} heeft de offerte afgewezen` },
  { test: (t) => t.startsWith("Klant koos"), kind: "moment", tab: "afspraken", title: (n) => `${n} heeft een moment gekozen` },
  { test: (t) => t.startsWith("Klant past geen van de voorgestelde momenten"), kind: "terugbellen", tab: "afspraken", title: (n) => `${n} wil teruggebeld worden` },
  { test: (t) => t.startsWith("Bezoek afgerond door") || t.startsWith("Installatie afgerond door"), kind: "afgerond", tab: "overview", title: (n) => `Klus bij ${n} afgerond door de monteur` },
  { test: (t) => / kan niet op /.test(t), kind: "afgemeld", tab: "afspraken", title: (n) => `Monteur kan niet bij ${n}` },
];

/** Een gesprek dat via de website is ingepland krijgt een id met het moment van aanmaken erin. */
export const CALL_PREFIX = "call-";
export const callId = () => `${CALL_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export type NoticeSources = { roster?: RosterRequest[]; items?: AgendaItem[] };

/**
 * Wat een melding waard is: dingen die u anders mist. Een nieuwe aanvraag, een akkoord of een roosteraanvraag
 * staat al als taak bij "Aan u" op het overzicht en hoeft niet ook nog te piepen.
 */
const WORTH_A_NOTICE = new Set<NoticeKind>(["afgemeld", "afgewezen", "gesprek"]);

export function notices(leads: Lead[], more: NoticeSources = {}, limit = 60): Notice[] {
  const out: Notice[] = [];
  for (const l of leads) {
    l.log.forEach((e, i) => {
      const rule = RULES.find((r) => r.test(e.text));
      if (rule) out.push({ id: `${l.id}-${i}`, at: e.at, kind: rule.kind, title: rule.title(l.customer.name), href: `/dashboard/${l.id}?tab=${rule.tab}` });
    });
  }
  for (const r of more.roster ?? []) {
    const n = r.dates.length;
    const days = `${n} ${n === 1 ? "dag" : "dagen"}`;
    out.push({
      id: `r-${r.id}`,
      at: r.created_at,
      kind: "rooster",
      title: r.kind === "off" ? `${r.who} vraagt ${days} ${(r.reason ?? "vrij").toLowerCase()} aan` : `${r.who} geeft ${days} op om te werken`,
      href: "/dashboard/rooster",
    });
  }
  for (const i of more.items ?? []) {
    if (!i.id.startsWith(CALL_PREFIX)) continue;
    const ms = Number(i.id.split("-")[1]);
    if (!Number.isFinite(ms)) continue;
    out.push({ id: i.id, at: new Date(ms).toISOString(), kind: "gesprek", title: `${i.title}, ingepland via de website`, href: `/dashboard/agenda?m=${i.date.slice(0, 7)}&d=${i.date}` });
  }
  return out
    .filter((n) => WORTH_A_NOTICE.has(n.kind))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/**
 * Ongelezen: nieuwer dan "alles gelezen" en nog niet los geopend. Nog nooit iets gelezen: alleen de laatste week,
 * zodat oude voorbeelddata geen stapel meldingen geeft.
 */
export function isUnread(n: Notice, seenAt?: string, read: string[] = []) {
  const since = seenAt ?? new Date(Date.now() - 7 * 86_400_000).toISOString();
  return n.at > since && !read.includes(n.id);
}

export const unreadCount = (leads: Lead[], seenAt?: string, read: string[] = [], more: NoticeSources = {}) =>
  notices(leads, more, 999).filter((n) => isUnread(n, seenAt, read)).length;
