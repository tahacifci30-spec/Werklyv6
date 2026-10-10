import type { Lead } from "./types";

/**
 * Hoe lang het plaatsen duurt. Een enkele unit is vaak een halve tot hele dag; meerdere ruimtes kosten
 * twee tot drie dagen. De schatting komt uit het klantformulier; de eigenaar past hem aan bij het inplannen.
 */
export const INSTALL_DURATIONS = [0.5, 1, 2, 3] as const;

export const durationLabel = (days: number) =>
  days === 0.5 ? "een halve dag" : days === 1 ? "één dag" : `${days} dagen`;

export const durationShort = (days: number) => (days === 0.5 ? "halve dag" : days === 1 ? "1 dag" : `${days} dagen`);

export function estimateInstallDays(answers: Record<string, string>): number {
  const { spaces, area, property, outdoor } = answers;
  if (spaces === "multiple") return area === "gt40" || property === "detached" ? 3 : 2;
  if (spaces === "living_bedroom") return 1;
  if ((spaces === "living" || spaces === "bedroom") && area === "lt20" && outdoor === "facade") return 0.5;
  return 1;
}

/** De duur die geldt: wat bij het inplannen is gekozen, anders de schatting. */
export const installDays = (lead: Lead) => lead.install_appointment?.days ?? estimateInstallDays(lead.answers);
