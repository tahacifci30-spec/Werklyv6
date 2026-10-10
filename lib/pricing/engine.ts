import { DONT_KNOW, visibleQuestions } from "../intake/questions";
import { UNKNOWN, type Estimate, type EstimateLine, type Lead, type QuoteItem } from "../types";
import { DEFAULT_RULES, type PricingRules } from "./rules";

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** De antwoorden waarmee gerekend wordt: per vraag het gekozen antwoord en het bedrag dat erbij hoort. */
export function priceLines(answers: Record<string, string>, rules: PricingRules = DEFAULT_RULES): EstimateLine[] {
  return visibleQuestions(rules.form, answers)
    .filter((q) => answers[q.id])
    .map((q) => {
      const o = q.options.find((x) => x.id === answers[q.id]);
      return { q: q.id, label: q.short, value: o?.label ?? DONT_KNOW.label, amount: o?.amount ?? 0 };
    });
}

/** Aantal units: het hoogste aantal dat bij een gekozen antwoord hoort (standaard 1). */
export function unitsFor(answers: Record<string, string>, rules: PricingRules = DEFAULT_RULES) {
  let units = 1;
  for (const q of visibleQuestions(rules.form, answers)) {
    const o = q.options.find((x) => x.id === answers[q.id]);
    if (o?.units && o.units > units) units = o.units;
  }
  return units;
}

/** Het middenbedrag: basisprijs voor het aantal units plus de bedragen van de gekozen antwoorden. */
export function midPrice(answers: Record<string, string>, rules: PricingRules = DEFAULT_RULES) {
  const units = unitsFor(answers, rules);
  return rules.firstUnit + (units - 1) * rules.extraUnit + priceLines(answers, rules).reduce((sum, l) => sum + l.amount, 0);
}

/** Berekent de prijsindicatie-range. Puur deterministisch; geen AI. */
export function estimatePrice(
  answers: Record<string, string>,
  rules: PricingRules = DEFAULT_RULES,
): Estimate {
  const mid = midPrice(answers, rules);
  const unknownFactors = visibleQuestions(rules.form, answers)
    .filter((q) => answers[q.id] === UNKNOWN)
    .map((q) => q.short.toLowerCase());

  const extra = unknownFactors.length * rules.unknownSpread;
  return {
    min: roundTo(mid * (rules.spreadLow - extra), rules.rounding),
    max: roundTo(mid * (rules.spreadHigh + extra), rules.rounding),
    unknownFactors,
    lines: priceLines(answers, rules),
  };
}

/** Laagste en hoogste prijsindicatie die het formulier kan geven, als voorbeeld bij Instellingen. */
export function priceBounds(rules: PricingRules) {
  const pick = (dir: 1 | -1) => {
    const answers: Record<string, string> = {};
    for (const q of rules.form) {
      if (q.showIf && !q.showIf.in.includes(answers[q.showIf.question] ?? "")) continue;
      const score = (o: { amount: number; units?: number }) => o.amount + ((o.units ?? 1) - 1) * rules.extraUnit;
      const best = [...q.options].sort((x, y) => dir * (score(x) - score(y)))[0];
      if (best) answers[q.id] = best.id;
    }
    return answers;
  };
  const unknown: Record<string, string> = {};
  for (const q of rules.form) if (!q.showIf) unknown[q.id] = UNKNOWN;
  return { low: estimatePrice(pick(1), rules), high: estimatePrice(pick(-1), rules), unknown: estimatePrice(unknown, rules) };
}

let seq = 0;
const itemId = () => `i${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Maakt een conceptofferte op basis van de prijsindicatie en de gegevens van het bezoek. */
export function generateQuoteItems(
  lead: Lead,
  rules: PricingRules = DEFAULT_RULES,
): QuoteItem[] {
  const values = lead.quote?.values ?? lead.answers;
  const est = estimatePrice(values, rules);
  const units = unitsFor(values, rules);
  const midTotal = (est.min + est.max) / 2;
  const installation = rules.quote.installation * units;
  const equipment = Math.max(0, roundTo(midTotal - installation, rules.rounding));

  const items: QuoteItem[] = [
    {
      id: itemId(),
      label: `Airco-installatie (${units} ${units === 1 ? "unit" : "units"})`,
      amount: equipment,
    },
    { id: itemId(), label: "Montage", amount: installation },
  ];

  const dist = lead.check.pipe_distance.value;
  if (dist === "10_15") {
    items.push({ id: itemId(), label: "Extra leiding (10–15 m)", amount: rules.quote.extraPipeMid });
  } else if (dist === "gt15") {
    items.push({ id: itemId(), label: "Extra leiding (> 15 m)", amount: rules.quote.extraPipeLong });
  }
  if (lead.check.wall_type.value === "hard") {
    items.push({ id: itemId(), label: "Boorwerk harde wand", amount: rules.quote.hardWall });
  }
  if (lead.check.meter_box.value === "work") {
    items.push({ id: itemId(), label: "Aanpassing meterkast", amount: rules.quote.meterBoxWork });
  }
  return items;
}

/** Conceptfactuur: de regels van de offerte plus het meerwerk uit het installatieverslag. */
export function generateInvoiceItems(lead: Lead): QuoteItem[] {
  const base = (lead.quote?.items ?? []).map((i) => ({ ...i, id: itemId() }));
  const extras = (lead.install?.extras ?? []).map((i) => ({ ...i, label: `Meerwerk: ${i.label}`, id: itemId() }));
  return [...base, ...extras];
}

/**
 * Een andere waarde kiezen bij de offerte: het verschil in prijs komt op de eerste regel (de installatie).
 * Zo blijven regels die de eigenaar zelf heeft aangepast of toegevoegd staan.
 */
export function applyValueChange(items: QuoteItem[], before: Record<string, string>, after: Record<string, string>, rules: PricingRules): QuoteItem[] {
  const delta = Math.round(midPrice(after, rules) - midPrice(before, rules));
  const units = unitsFor(after, rules);
  const target = Math.max(0, items.findIndex((i) => i.label.startsWith("Airco-installatie")));
  return items.map((it, i) => {
    if (i !== target) return it;
    const label = it.label.replace(/\(\d+ units?\)/, `(${units} ${units === 1 ? "unit" : "units"})`);
    // Een regel met aantal en stukprijs wordt een vast bedrag, anders klopt het aantal niet meer.
    return { id: it.id, label, amount: Math.max(0, it.amount + delta) };
  });
}

/** Tekst bij een regel met een aantal, bijvoorbeeld "3 × € 35 per meter". */
export const qtyText = (i: QuoteItem) =>
  i.qty && i.price !== undefined ? `${String(i.qty).replace(".", ",")} × ${formatEur(i.price)}${i.unit ? ` ${i.unit}` : ""}` : "";

export const quoteTotal = (items: QuoteItem[]) =>
  items.reduce((sum, i) => sum + (Number.isFinite(i.amount) ? i.amount : 0), 0);

const eur = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
export const formatEur = (n: number) => eur.format(n);
export const formatRange = (e: Estimate) =>
  `${formatEur(e.min)} – ${formatEur(e.max)}`;
