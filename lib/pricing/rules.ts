/**
 * Prijsregels. Alle bedragen in euro, inclusief btw: richtbedragen voor de prijsindicatie.
 * Per bedrijf aan te passen in Instellingen (opgeslagen in company_settings.pricing).
 * PLACEHOLDER-bedragen: pas deze aan naar de echte tarieven van het bedrijf.
 */
/** Eén antwoord op een vraag, met het bedrag dat het aan de prijs toevoegt (mag negatief zijn). */
export type FormOption = {
  id: string;
  label: string;
  hint?: string;
  /** Toeslag in euro, inclusief btw */
  amount: number;
  /** Aantal units dat bij dit antwoord hoort (alleen bij de vraag die het aantal bepaalt) */
  units?: number;
};

/** Eén vraag uit het klantformulier. De eigenaar past tekst, antwoorden en bedragen aan bij Instellingen. */
export type FormQuestion = {
  id: string;
  title: string;
  help?: string;
  /** Korte naam, voor het dossier en bij de offerte */
  short: string;
  options: FormOption[];
  /** Alleen tonen als op een eerdere vraag een van deze antwoorden is gegeven */
  showIf?: { question: string; in: string[] };
};

export type PricingRules = {
  firstUnit: number;
  extraUnit: number;
  /** Aantal units per antwoord op "spaces" ("unknown" telt als 1) */
  unitsBySpaces: Record<string, number>;
  areaSurcharge: Record<string, number>;
  propertySurcharge: Record<string, number>;
  /** Waar de buitenunit komt (gevel, balkon, dak, tuin) */
  outdoorSurcharge: Record<string, number>;
  /** Alleen bij meerdere ruimtes */
  systemSurcharge: Record<string, number>;
  /** Alleen bij één ruimte */
  existingAdjustment: Record<string, number>;
  /** Marge rond het middenbedrag */
  spreadLow: number;
  spreadHigh: number;
  /** Extra spreiding per onbekende factor */
  unknownSpread: number;
  rounding: number;
  quote: {
    installation: number;
    extraPipeMid: number;
    extraPipeLong: number;
    hardWall: number;
    meterBoxWork: number;
  };
  /** De vragen van het klantformulier met per antwoord het bedrag. Hiermee wordt de prijs berekend. */
  form: FormQuestion[];
};

type Tables = Pick<PricingRules, "unitsBySpaces" | "areaSurcharge" | "propertySurcharge" | "outdoorSurcharge" | "systemSurcharge" | "existingAdjustment">;

/** Het standaardformulier voor airco. De bedragen komen uit de (eerder opgeslagen) toeslagen. */
export function formFromTables(t: Tables): FormQuestion[] {
  const amt = (table: Record<string, number> | undefined, id: string) => table?.[id] ?? 0;
  return [
    {
      id: "spaces",
      title: "Waar wilt u een airco?",
      short: "Ruimtes",
      options: [
        { id: "living", label: "Woonkamer", amount: 0, units: t.unitsBySpaces?.living ?? 1 },
        { id: "bedroom", label: "Slaapkamer", amount: 0, units: t.unitsBySpaces?.bedroom ?? 1 },
        { id: "living_bedroom", label: "Woonkamer en slaapkamer", amount: 0, units: t.unitsBySpaces?.living_bedroom ?? 2 },
        { id: "multiple", label: "Meerdere ruimtes", hint: "3 of meer", amount: 0, units: t.unitsBySpaces?.multiple ?? 3 },
      ],
    },
    {
      id: "area",
      title: "Hoe groot is de ruimte ongeveer?",
      help: "Bij meerdere ruimtes: de grootste ruimte.",
      short: "Oppervlakte",
      options: [
        { id: "lt20", label: "Minder dan 20 m²", amount: amt(t.areaSurcharge, "lt20") },
        { id: "20_30", label: "20 tot 30 m²", amount: amt(t.areaSurcharge, "20_30") },
        { id: "30_40", label: "30 tot 40 m²", amount: amt(t.areaSurcharge, "30_40") },
        { id: "gt40", label: "Meer dan 40 m²", amount: amt(t.areaSurcharge, "gt40") },
      ],
    },
    {
      id: "property",
      title: "In wat voor woning komt de airco?",
      short: "Type woning",
      options: [
        { id: "terraced", label: "Rijtjeswoning", amount: amt(t.propertySurcharge, "terraced") },
        { id: "corner", label: "Hoekwoning of twee-onder-een-kap", amount: amt(t.propertySurcharge, "corner") },
        { id: "detached", label: "Vrijstaande woning", amount: amt(t.propertySurcharge, "detached") },
        { id: "apartment", label: "Appartement", amount: amt(t.propertySurcharge, "apartment") },
      ],
    },
    {
      id: "outdoor",
      title: "Waar kan de buitenunit komen?",
      help: "Dat is het kastje aan de buitenkant van de woning.",
      short: "Plek buitenunit",
      options: [
        { id: "facade", label: "Aan de gevel", amount: amt(t.outdoorSurcharge, "facade") },
        { id: "balcony", label: "Op het balkon", amount: amt(t.outdoorSurcharge, "balcony") },
        { id: "roof", label: "Op het platte dak", amount: amt(t.outdoorSurcharge, "roof") },
        { id: "ground", label: "Op de grond in de tuin", amount: amt(t.outdoorSurcharge, "ground") },
      ],
    },
    {
      id: "system",
      title: "Welke opstelling heeft uw voorkeur?",
      help: "Eén buitenunit voor alle ruimtes, of een eigen unit per ruimte.",
      short: "Opstelling",
      showIf: { question: "spaces", in: ["living_bedroom", "multiple"] },
      options: [
        { id: "multisplit", label: "Eén buitenunit", hint: "Voor alle ruimtes samen", amount: amt(t.systemSurcharge, "multisplit") },
        { id: "separate", label: "Een eigen unit per ruimte", hint: "Losse units", amount: amt(t.systemSurcharge, "separate") },
      ],
    },
    {
      id: "existing",
      title: "Is er al een airco of leidingwerk aanwezig?",
      short: "Bestaande installatie",
      showIf: { question: "spaces", in: ["living", "bedroom"] },
      options: [
        { id: "none", label: "Nee, een nieuwe installatie", amount: amt(t.existingAdjustment, "none") },
        { id: "replace", label: "Ja, een airco vervangen", amount: amt(t.existingAdjustment, "replace") },
        { id: "piping", label: "Ja, het leidingwerk ligt er al", amount: amt(t.existingAdjustment, "piping") },
      ],
    },
  ];
}

const TABLES: Tables = {
  unitsBySpaces: { living: 1, bedroom: 1, living_bedroom: 2, multiple: 3 },
  areaSurcharge: { lt20: 0, "20_30": 250, "30_40": 500, gt40: 900 },
  propertySurcharge: { apartment: 0, terraced: 0, corner: 100, detached: 200 },
  outdoorSurcharge: { facade: 0, balcony: 0, roof: 350, ground: 200 },
  systemSurcharge: { multisplit: 350, separate: 0 },
  existingAdjustment: { none: 0, replace: -150, piping: -250 },
};

export const DEFAULT_RULES: PricingRules = {
  firstUnit: 1850,
  extraUnit: 1350,
  ...TABLES,
  spreadLow: 0.92,
  spreadHigh: 1.15,
  unknownSpread: 0.04,
  rounding: 50,
  quote: {
    installation: 650,
    extraPipeMid: 150,
    extraPipeLong: 300,
    hardWall: 120,
    meterBoxWork: 250,
  },
  form: formFromTables(TABLES),
};

/**
 * Vult opgeslagen regels aan met standaardwaarden, zodat regels uit een eerdere versie
 * (zonder nieuwe velden, met oude velden) blijven werken.
 */
export function mergeRules(stored?: Partial<PricingRules> | null): PricingRules {
  const out = structuredClone(DEFAULT_RULES) as unknown as Record<string, unknown>;
  if (!stored) return out as unknown as PricingRules;
  for (const [key, def] of Object.entries(DEFAULT_RULES)) {
    if (key === "form") continue;
    const v = (stored as Record<string, unknown>)[key];
    if (v === undefined || v === null) continue;
    out[key] = typeof def === "object" ? { ...(def as object), ...(v as object) } : v;
  }
  // Nog geen eigen formulier opgeslagen: bouw het op uit de toeslagen die er al stonden, zodat prijzen gelijk blijven.
  const merged = out as unknown as PricingRules;
  merged.form = Array.isArray(stored.form) && stored.form.length > 0 ? stored.form : formFromTables(merged);
  return merged;
}
