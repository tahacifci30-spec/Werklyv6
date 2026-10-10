import { findQuestion, optionLabel, type FormQuestion } from "./intake/questions";
import { UNKNOWN, type Lead, type Source } from "./types";

export type Fact = { label: string; value: string; source: Source };

const unknownText = "Onbekend: de monteur controleert dit bij het bezoek";

/** Wat de klant heeft opgegeven (of niet wist), in de volgorde van het formulier. */
export function requestFacts(lead: Lead, form: FormQuestion[]): Fact[] {
  const order = [...form.map((q) => q.id), ...Object.keys(lead.answers)].filter((id, i, all) => all.indexOf(id) === i);
  return order
    .filter((id) => lead.answers[id])
    .map((id) => {
      const v = lead.answers[id];
      // De naam en het antwoord zoals ze waren toen de klant het formulier invulde.
      const line = lead.estimate.lines?.find((l) => l.q === id);
      const label = line?.label ?? findQuestion(form, id)?.short ?? id;
      if (v === UNKNOWN) return { label, value: unknownText, source: "unknown" as const };
      return { label, value: line?.value ?? optionLabel(form, id, v), source: "customer" as const };
    });
}

/** Controlepunten bij het eerste bezoek (opname). */
export const TECH_OPTIONS = {
  outdoor_unit: {
    label: "Buitenunit mogelijk?",
    options: [
      { id: "yes", label: "Ja" },
      { id: "no", label: "Nee" },
    ],
  },
  pipe_distance: {
    label: "Leidingafstand",
    options: [
      { id: "1_5", label: "1–5 m" },
      { id: "5_10", label: "5–10 m" },
      { id: "10_15", label: "10–15 m" },
      { id: "gt15", label: "Meer dan 15 m" },
    ],
  },
  meter_box: {
    label: "Meterkast gecontroleerd?",
    options: [
      { id: "ok", label: "Ja, geen aanpassing" },
      { id: "work", label: "Ja, aanpassing nodig" },
      { id: "no", label: "Nee" },
    ],
  },
  wall_type: {
    label: "Type wand",
    options: [
      { id: "soft", label: "Gipsplaat of spouw" },
      { id: "hard", label: "Beton of steen" },
    ],
  },
  mounting: {
    label: "Montage mogelijk?",
    options: [
      { id: "yes", label: "Ja" },
      { id: "no", label: "Nee" },
    ],
  },
} as const;

export type TechKey = keyof typeof TECH_OPTIONS;
export const TECH_KEYS = Object.keys(TECH_OPTIONS) as TechKey[];

export function techLabel(key: TechKey, value: string) {
  if (value === UNKNOWN) return "Onbekend";
  return TECH_OPTIONS[key].options.find((o) => o.id === value)?.label ?? value;
}

/** Technische punten die nog gecontroleerd moeten worden. */
export function openChecks(lead: Lead): TechKey[] {
  return TECH_KEYS.filter((k) => lead.check[k].source !== "verified");
}

/** Controlepunten op de dag van de installatie. */
export const INSTALL_CHECKS = [
  { id: "condensate", label: "Condensafvoer aangesloten en getest" },
  { id: "vacuum_leak", label: "Vacuüm getrokken en lekdichtheid gecontroleerd" },
  { id: "test_run", label: "Proefgedraaid: koelen en verwarmen werken" },
  { id: "explained", label: "Uitleg aan de klant gegeven (bediening en onderhoud)" },
  { id: "cleaned", label: "Werkplek opgeruimd" },
] as const;

export const INSTALL_PIPE_OPTIONS = [
  { id: "1_5", label: "1–5 m" },
  { id: "5_10", label: "5–10 m" },
  { id: "10_15", label: "10–15 m" },
  { id: "gt15", label: "Meer dan 15 m" },
] as const;

export const SOURCE_LABEL: Record<Source, string> = {
  customer: "Door klant opgegeven",
  unknown: "Onbekend",
  estimated: "Geschat",
  verified: "Door monteur gecontroleerd",
};

export const SOURCE_STYLE: Record<Source, string> = {
  customer: "bg-sky-50 text-sky-800 ring-sky-200",
  unknown: "bg-amber-50 text-amber-900 ring-amber-200",
  estimated: "bg-violet-50 text-violet-800 ring-violet-200",
  verified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};
