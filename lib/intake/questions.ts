import { DEFAULT_RULES, type FormOption, type FormQuestion } from "../pricing/rules";
import { UNKNOWN } from "../types";

/**
 * Het klantformulier. De vragen, antwoorden en bedragen staan per bedrijf in de instellingen
 * (PricingRules.form); hier staat alleen de logica om er doorheen te lopen.
 */
export type { FormOption, FormQuestion };

export const DEFAULT_FORM = DEFAULT_RULES.form;
export const DONT_KNOW = { id: UNKNOWN, label: "Weet ik niet" } as const;

const shown = (q: FormQuestion, answers: Record<string, string>) =>
  !q.showIf || q.showIf.in.includes(answers[q.showIf.question] ?? "");

/** De vragen die bij deze antwoorden horen, in volgorde. */
export const visibleQuestions = (form: FormQuestion[], answers: Record<string, string>) => form.filter((q) => shown(q, answers));

/** Welke vraag volgt? Geeft null terug wanneer het formulier klaar is. */
export const nextQuestion = (form: FormQuestion[], answers: Record<string, string>): FormQuestion | null =>
  visibleQuestions(form, answers).find((q) => !answers[q.id]) ?? null;

export const isComplete = (form: FormQuestion[], answers: Record<string, string>) => nextQuestion(form, answers) === null;

/** Hoeveel vragen de klant in totaal krijgt, ook als een vervolgvraag nog niet vaststaat. */
export function totalQuestions(form: FormQuestion[], answers: Record<string, string>) {
  let total = form.filter((q) => !q.showIf).length;
  const controllers = new Set(form.filter((q) => q.showIf).map((q) => q.showIf!.question));
  for (const c of controllers) {
    const followUps = form.filter((q) => q.showIf?.question === c);
    if (answers[c]) total += followUps.filter((q) => q.showIf!.in.includes(answers[c])).length;
    else {
      const options = form.find((q) => q.id === c)?.options ?? [];
      total += Math.max(0, ...options.map((o) => followUps.filter((q) => q.showIf!.in.includes(o.id)).length));
    }
  }
  return total;
}

export const findQuestion = (form: FormQuestion[], id: string) => form.find((q) => q.id === id) ?? DEFAULT_FORM.find((q) => q.id === id);

export function optionLabel(form: FormQuestion[], questionId: string, optionId: string | undefined) {
  if (!optionId) return "–";
  if (optionId === UNKNOWN) return DONT_KNOW.label;
  return findQuestion(form, questionId)?.options.find((o) => o.id === optionId)?.label ?? optionId;
}

/** Geldig antwoord? Gebruikt voor de controle op de server. */
export const isValidAnswer = (form: FormQuestion[], questionId: string, optionId: string) => {
  const q = form.find((x) => x.id === questionId);
  return !!q && (optionId === UNKNOWN || q.options.some((o) => o.id === optionId));
};
