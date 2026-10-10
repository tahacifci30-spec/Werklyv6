import { quoteTotal } from "./pricing/engine";
import { UNKNOWN, type Lead } from "./types";
import { isOpen, isWon } from "./workflow";

const DAY = 86_400_000;

export type Metrics = {
  newThisWeek: number;
  pipelineValue: number;
  /** Aandeel aanvragen waarbij de klant niets met "weet ik niet" beantwoordde */
  completeRate: number | null;
  /** Gemiddeld aantal dagen van aanvraag tot verstuurde offerte */
  daysToQuote: number | null;
  /** Aandeel akkoord van alle beslissingen */
  winRate: number | null;
  decided: number;
};

export function computeMetrics(leads: Lead[], now = Date.now()): Metrics {
  const newThisWeek = leads.filter((l) => now - Date.parse(l.created_at) < 7 * DAY).length;

  const pipelineValue = leads.filter(isOpen).reduce((sum, l) => {
    if (l.invoice) return sum + quoteTotal(l.invoice.items);
    if (l.quote) return sum + quoteTotal(l.quote.items);
    return sum + (l.estimate.min + l.estimate.max) / 2;
  }, 0);

  const completeRate = leads.length
    ? leads.filter((l) => !Object.values(l.answers).includes(UNKNOWN)).length / leads.length
    : null;

  const sent = leads.filter((l) => l.quote?.sent_at);
  const daysToQuote = sent.length
    ? sent.reduce((s, l) => s + (Date.parse(l.quote!.sent_at!) - Date.parse(l.created_at)), 0) /
      sent.length /
      DAY
    : null;

  const accepted = leads.filter((l) => isWon(l.status)).length;
  const rejected = leads.filter((l) => l.status === "rejected").length;
  const decided = accepted + rejected;

  return {
    newThisWeek,
    pipelineValue,
    completeRate,
    daysToQuote,
    winRate: decided ? accepted / decided : null,
    decided,
  };
}

export function lastActivity(l: Lead) {
  return l.log.length ? l.log[l.log.length - 1].at : l.created_at;
}

export function daysSince(iso: string, now = Date.now()) {
  return Math.floor((now - Date.parse(iso)) / DAY);
}

export function ageLabel(days: number) {
  if (days <= 0) return "vandaag";
  if (days === 1) return "gisteren";
  return `${days} dagen geleden`;
}
