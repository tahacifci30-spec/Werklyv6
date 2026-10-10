"use client";

import { useState, useTransition } from "react";
import { saveForm } from "@/app/actions";
import type { FormOption, FormQuestion } from "@/lib/pricing/rules";
import { useUnsavedWarning } from "../useUnsavedWarning";
import { field } from "../ui";

type Opt = Omit<FormOption, "amount" | "units"> & { amount: string; units: string };
type Q = Omit<FormQuestion, "options"> & { options: Opt[] };

const uid = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;
const toState = (form: FormQuestion[]): Q[] =>
  form.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o, amount: String(o.amount), units: o.units ? String(o.units) : "" })) }));

/**
 * De vragen van het klantformulier met per antwoord het bedrag. Dit zijn de waardes waarmee de prijs wordt berekend:
 * de eigenaar bepaalt zelf waarmee hij rekent (m², m³, type woning, of iets heel anders).
 */
export function FormEditor({ form }: { form: FormQuestion[] }) {
  const [qs, setQs] = useState<Q[]>(toState(form));
  const [open, setOpen] = useState<string | null>(null);
  const [initial] = useState(() => JSON.stringify(toState(form)));

  const patchQ = (id: string, p: Partial<Q>) => setQs((l) => l.map((q) => (q.id === id ? { ...q, ...p } : q)));
  const patchO = (qid: string, oid: string, p: Partial<Opt>) =>
    setQs((l) => l.map((q) => (q.id === qid ? { ...q, options: q.options.map((o) => (o.id === oid ? { ...o, ...p } : o)) } : q)));
  const move = (i: number, by: number) =>
    setQs((l) => {
      const j = i + by;
      if (j < 0 || j >= l.length) return l;
      const copy = [...l];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const addQuestion = () => {
    const id = uid("q");
    setQs((l) => [...l, { id, title: "", short: "", options: [{ id: uid("o"), label: "", amount: "0", units: "" }, { id: uid("o"), label: "", amount: "0", units: "" }] }]);
    setOpen(id);
  };
  // Een vraag waar een andere vraag van afhangt kan niet zomaar weg: dan verdwijnt die vervolgvraag ook.
  const removeQuestion = (id: string) => setQs((l) => l.filter((q) => q.id !== id && q.showIf?.question !== id));

  const payload = JSON.stringify(qs);
  // Wat er het laatst is opgeslagen; wijkt het formulier daarvan af, dan waarschuwen we bij weggaan.
  const [saved, setSaved] = useState(payload);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const dirty = payload !== saved;
  useUnsavedWarning(dirty);
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const sent = payload;
    start(async () => {
      const res = await saveForm(undefined, data);
      setError(res?.error);
      if (res?.ok) setSaved(sent);
    });
  };

  return (
    <form onSubmit={submit} method="post" className="space-y-4">
          <input type="hidden" name="payload" value={payload} />
          <p className="text-sm text-muted">
            De prijs is de basisprijs plus het bedrag van elk gekozen antwoord. U bepaalt zelf waarmee u rekent: pas een vraag aan, verander
            bijvoorbeeld m² in m³, of voeg een eigen vraag toe. &ldquo;Weet ik niet&rdquo; staat er altijd vanzelf bij.
          </p>

          <ul className="space-y-2">
            {qs.map((q, i) => {
              const isOpen = open === q.id;
              const hasUnits = q.options.some((o) => o.units);
              const parent = q.showIf ? qs.find((x) => x.id === q.showIf!.question) : undefined;
              return (
                <li key={q.id} className="rounded-xl border border-line bg-background">
                  <div className="flex items-center gap-1 p-2 pl-4">
                    <button type="button" onClick={() => setOpen(isOpen ? null : q.id)} aria-expanded={isOpen} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="tabular grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface text-xs font-semibold ring-1 ring-inset ring-line">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{q.title || "Nieuwe vraag"}</span>
                        <span className="block truncate text-xs text-muted">
                          {q.options.length} antwoorden{parent ? `, alleen na een antwoord op "${parent.short || parent.title}"` : ""}
                        </span>
                      </span>
                    </button>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Vraag omhoog" className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:bg-surface disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === qs.length - 1} aria-label="Vraag omlaag" className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:bg-surface disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => setOpen(isOpen ? null : q.id)} className="hidden min-h-11 rounded-lg px-3 text-sm font-medium text-brand-strong hover:bg-surface sm:block">
                      {isOpen ? "Sluiten" : "Wijzigen"}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="space-y-4 border-t border-line p-4">
                      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <div>
                          <label htmlFor={`t-${q.id}`} className="mb-1.5 block text-sm font-medium">Vraag aan de klant</label>
                          <input id={`t-${q.id}`} value={q.title} maxLength={120} onChange={(e) => patchQ(q.id, { title: e.target.value })} className={field} placeholder="Bijvoorbeeld: hoe groot is de ruimte?" />
                        </div>
                        <div>
                          <label htmlFor={`s-${q.id}`} className="mb-1.5 block text-sm font-medium">Korte naam</label>
                          <input id={`s-${q.id}`} value={q.short} maxLength={30} onChange={(e) => patchQ(q.id, { short: e.target.value })} className={field} placeholder="Bijvoorbeeld: inhoud" />
                          <p className="mt-1 text-xs text-muted">Zo heet het in het dossier en bij de offerte.</p>
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`h-${q.id}`} className="mb-1.5 block text-sm font-medium">Uitleg onder de vraag</label>
                        <input id={`h-${q.id}`} value={q.help ?? ""} maxLength={160} onChange={(e) => patchQ(q.id, { help: e.target.value })} className={field} />
                      </div>

                      <fieldset className="min-w-0">
                        <legend className="text-sm font-medium">Antwoorden en wat ze kosten</legend>
                        <p className="mt-0.5 text-xs text-muted">Bedrag in euro, inclusief btw. 0 = geen toeslag. Een min ervoor geeft korting.</p>
                        <ul className="mt-2 space-y-2">
                          {q.options.map((o, oi) => (
                            <li key={o.id} className={`grid items-center gap-2 ${hasUnits ? "grid-cols-[4rem_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_4rem_6rem_auto]" : "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_6rem_auto]"}`}>
                              <input aria-label={`Antwoord ${oi + 1}`} value={o.label} maxLength={60} onChange={(e) => patchO(q.id, o.id, { label: e.target.value })} className={`${field} ${hasUnits ? "col-span-3" : "col-span-2"} sm:col-span-1`} placeholder="Bijvoorbeeld: 50 tot 75 m³" />
                              {hasUnits && (
                                <input aria-label={`Aantal units bij antwoord ${oi + 1}`} title="Aantal units" inputMode="numeric" value={o.units} onChange={(e) => patchO(q.id, o.id, { units: e.target.value })} className={`${field} tabular px-2 text-center`} />
                              )}
                              <span className="relative">
                                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">€</span>
                                <input aria-label={`Bedrag bij antwoord ${oi + 1}`} inputMode="decimal" value={o.amount} onChange={(e) => patchO(q.id, o.id, { amount: e.target.value })} className={`${field} tabular pl-7 text-right`} />
                              </span>
                              <button
                                type="button"
                                aria-label={`Antwoord ${oi + 1} verwijderen`}
                                disabled={q.options.length <= 1}
                                onClick={() => patchQ(q.id, { options: q.options.filter((x) => x.id !== o.id) })}
                                className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                              >
                                <span aria-hidden="true">✕</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        {hasUnits && <p className="mt-1.5 text-xs text-muted">Het smalle vakje is het aantal units bij dat antwoord. Elke extra unit telt de prijs voor een extra unit mee.</p>}
                        <button
                          type="button"
                          onClick={() => patchQ(q.id, { options: [...q.options, { id: uid("o"), label: "", amount: "0", units: hasUnits ? "1" : "" }] })}
                          className="mt-1 min-h-11 text-sm font-semibold text-brand hover:underline"
                        >
                          + Antwoord toevoegen
                        </button>
                      </fieldset>

                      <button type="button" onClick={() => removeQuestion(q.id)} disabled={qs.length <= 1} className="min-h-11 text-sm font-semibold text-red-700 hover:underline disabled:opacity-40">
                        Vraag verwijderen
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <button type="button" onClick={addQuestion} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-semibold text-brand-strong hover:border-brand hover:bg-brand-soft">
            <span className="text-xl leading-none" aria-hidden="true">+</span> Vraag toevoegen
          </button>

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {!dirty && !error && saved !== initial && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Opgeslagen. Het klantformulier gebruikt nu deze vragen en bedragen.</p>}
          {dirty && <p className="text-sm text-amber-900">U heeft wijzigingen die nog niet zijn opgeslagen.</p>}
          <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white transition-transform duration-100 hover:bg-brand-strong active:scale-[0.97] disabled:opacity-50">
            {pending ? "Opslaan…" : "Vragen en bedragen opslaan"}
          </button>
    </form>
  );
}
