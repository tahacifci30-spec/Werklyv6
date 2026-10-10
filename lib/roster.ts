import { itemDays, weekdayIndex } from "./agenda";
import { addDays, dayShort, isDay, parseDay } from "./dates";
import type { AgendaItem, RosterRequest, TeamMember } from "./types";

/**
 * Het rooster: wie werkt wanneer. Een dag is een werkdag als hij bij iemands vaste dagen hoort of als losse dag is
 * goedgekeurd, en er geen goedgekeurd verlof of ziekte op staat. Aanvragen die nog wachten veranderen niets.
 */
export const mondayOf = (day: string) => addDays(day, -weekdayIndex(day));
export const weekOf = (w: string | undefined, today: string) => mondayOf(isDay(w) ? w : today);
export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

/** Weeknummer volgens de Nederlandse (ISO) telling. */
export function weekNumber(day: string) {
  const d = parseDay(day);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const first = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round(((d.getTime() - first.getTime()) / 86_400_000 - 3 + ((first.getDay() + 6) % 7)) / 7);
}

/** "ma 12 okt t/m vr 16 okt, ma 26 okt": opeenvolgende dagen als periode. */
export function datesText(dates: string[]) {
  const parts: string[] = [];
  const sorted = [...dates].sort();
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && addDays(sorted[j], 1) === sorted[j + 1]) j++;
    parts.push(j > i ? `${dayShort(sorted[i])} t/m ${dayShort(sorted[j])}` : dayShort(sorted[i]));
    i = j;
  }
  return parts.join(", ");
}

export type DayState = {
  date: string;
  /** Staat ingeroosterd (vaste dag of goedgekeurde losse dag) */
  scheduled: boolean;
  /** Goedgekeurd vrij, verlof of ziek: de reden */
  off?: string;
  /** Er wacht een aanvraag voor deze dag */
  pending?: "off" | "work";
  /** Werkt deze dag echt: ingeroosterd en niet afwezig */
  works: boolean;
};

export function dayState(member: TeamMember | undefined, items: AgendaItem[], requests: RosterRequest[], who: string, date: string): DayState {
  const scheduled = !!member && (member.days.includes(weekdayIndex(date)) || !!member.extra?.includes(date));
  const offItem = items.find((i) => i.kind === "off" && i.who === who && itemDays(i).includes(date));
  const pending = requests.find((r) => r.who === who && r.status === "pending" && r.dates.includes(date))?.kind;
  return { date, scheduled, off: offItem?.title, pending, works: scheduled && !offItem };
}
