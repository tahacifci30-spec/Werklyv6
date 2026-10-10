"use client";

import { useState, useTransition } from "react";
import { useUnsavedWarning } from "../useUnsavedWarning";
import type { FormState } from "@/app/actions";
import { formatEur, quoteTotal } from "@/lib/pricing/engine";
import type { Product, QuoteItem } from "@/lib/types";
import { ActionForm } from "../ActionForm";
import { SubmitButton } from "../SubmitButton";
import { btn, field } from "../ui";

const COPY = {
  offerte: {
    approve: "Goedkeuren en delen",
    hint: "Controleer de regels hierboven. Sla eerst eventuele wijzigingen op. Na het goedkeuren krijgt u een kant-en-klaar bericht met de link voor de klant.",
    question: (total: string, to: string) => `Offerte van ${total} goedkeuren voor ${to}?`,
    note: "Werkly mailt niet zelf. Na het goedkeuren stuurt u de link met één tik via WhatsApp of e-mail. Vraagt de klant daarna iets extra, dan past u de offerte aan.",
    yes: "Ja, goedkeuren",
  },
  factuur: {
    approve: "Factuur definitief maken en delen",
    hint: "Controleer de regels hierboven, ook het meerwerk van de monteur. Sla eerst eventuele wijzigingen op.",
    question: (total: string, to: string) => `Factuur van ${total} definitief maken voor ${to}?`,
    note: "Er wordt een factuurnummer toegekend en de factuur kan daarna niet meer worden aangepast. Werkly mailt niet zelf: u stuurt de link daarna via WhatsApp of e-mail.",
    yes: "Ja, definitief maken",
  },
} as const;

/** Een waarde waarmee de prijs is berekend, met de antwoorden waaruit u kunt kiezen. */
export type QuoteValue = { id: string; short: string; current: string; options: { id: string; label: string }[] };

type Row = { id: string; label: string; amount: string; qty?: string; price?: number; unit?: string };

const num = (v: string) => Number(v.replace(",", ".")) || 0;
const toRow = (i: QuoteItem): Row => ({
  id: i.id,
  label: i.label,
  amount: String(i.amount),
  ...(i.qty && i.price !== undefined ? { qty: String(i.qty), price: i.price, unit: i.unit } : {}),
});

/** Bewerkbare regels voor een offerte of een factuur, met bedrag en totaal. */
export function QuoteEditor({
  kind = "offerte",
  initial,
  editable,
  save,
  approve,
  recipient,
  products = [],
  values,
  changeValue,
  mail = false,
}: {
  kind?: "offerte" | "factuur";
  initial: QuoteItem[];
  editable: boolean;
  save: (state: FormState, form: FormData) => Promise<FormState>;
  /** Alleen meegegeven wanneer het document ter controle ligt. */
  approve?: () => Promise<void>;
  recipient: string;
  /** Vaste producten die bij het typen opduiken */
  products?: Product[];
  /** De waardes waarmee de offerte is berekend; een andere kiezen past de prijs aan */
  values?: QuoteValue[];
  changeValue?: (question: string, option: string) => Promise<void>;
  /** Mailen staat aan en de klant heeft een e-mailadres: dan gaat het document vanzelf de deur uit */
  mail?: boolean;
}) {
  const base = COPY[kind];
  const copy = mail
    ? {
        ...base,
        approve: kind === "offerte" ? "Goedkeuren en mailen" : "Factuur definitief maken en mailen",
        question: (total: string, to: string) => `${kind === "offerte" ? "Offerte" : "Factuur"} van ${total} mailen naar ${to}?`,
        note: kind === "offerte" ? "De klant krijgt een e-mail met de link en kan online akkoord geven." : "Er wordt een factuurnummer toegekend en de klant krijgt een e-mail met de link. Daarna kan de factuur niet meer worden aangepast.",
        yes: "Ja, mailen",
      }
    : base;
  const [items, setItems] = useState<Row[]>(initial.map(toRow));
  const [confirming, setConfirming] = useState(false);
  const [recalculating, startRecalc] = useTransition();

  const total = quoteTotal(items.map((i) => ({ ...i, amount: num(i.amount) })) as unknown as QuoteItem[]);
  const snapshot = (list: Row[]) => JSON.stringify(list.map((i) => [i.label, i.amount, i.qty ?? ""]));
  const dirty = snapshot(items) !== snapshot(initial.map(toRow));
  useUnsavedWarning(editable && dirty);
  const patch = (idx: number, p: Partial<Row>) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...p } : it)));

  const fromProduct = (p: Product): Partial<Row> => ({ amount: String(p.amount), qty: "1", price: p.amount, unit: p.unit || "per stuk" });
  // Kies je een vast product, dan komt de prijs er meteen bij (als er nog geen bedrag staat).
  const setLabel = (idx: number, label: string) => {
    const hit = products.find((p) => p.label.toLowerCase() === label.trim().toLowerCase());
    setItems((list) =>
      list.map((it, i) => (i === idx ? { ...it, label, ...(hit && (!it.amount || it.amount === "0") ? fromProduct(hit) : {}) } : it)),
    );
  };
  // Zelf een bedrag typen maakt er een vast bedrag van; het aantal vervalt dan.
  const setAmount = (idx: number, amount: string) => patch(idx, { amount, qty: undefined, price: undefined, unit: undefined });
  const setQty = (idx: number, qty: string) => {
    const it = items[idx];
    if (it.price === undefined) return;
    patch(idx, { qty, amount: String(Math.round(num(qty) * it.price * 100) / 100) });
  };
  const addProduct = (p: Product) => setItems((l) => [...l, { id: `n${l.length}${Date.now()}`, label: p.label, ...fromProduct(p) } as Row]);
  const listId = `products-${kind}`;

  return (
    <div>
      {editable && values && values.length > 0 && changeValue && (
        <section aria-labelledby="values-title" className="mb-5 rounded-xl bg-background p-4">
          <h3 id="values-title" className="text-sm font-semibold">Berekend met deze waardes</h3>
          <p className="mt-0.5 text-sm text-muted">
            Is het na het bezoek anders? Tik op een waarde en kies de juiste. De prijs past zich direct aan.
          </p>
          <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {values.map((v) => (
              <li key={v.id} className="min-w-0">
                <label className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-line bg-surface pl-3 pr-1 text-sm focus-within:border-brand">
                  <span className="shrink-0 text-muted">{v.short}</span>
                  <select
                    value={v.current}
                    disabled={dirty || recalculating}
                    onChange={(e) => {
                      const option = e.target.value;
                      startRecalc(async () => changeValue(v.id, option));
                    }}
                    className="min-h-10 min-w-0 flex-1 rounded-lg bg-transparent py-1 pl-1 pr-6 font-semibold text-foreground disabled:opacity-50 sm:max-w-[14rem] sm:flex-none"
                  >
                    {v.options.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
          {dirty && <p className="mt-2 text-sm text-amber-900">Sla eerst uw wijzigingen in de regels op. Daarna kunt u een waarde wijzigen.</p>}
          {recalculating && <p role="status" className="mt-2 text-sm text-muted">Prijs opnieuw berekenen…</p>}
        </section>
      )}

      <ActionForm action={save}>
        {({ state, pending }) => (
          <>
            <ul className="space-y-3">
              {items.map((it, i) => (
                <li key={it.id}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto]">
                    <input
                      name="label"
                      aria-label={`Omschrijving regel ${i + 1}`}
                      value={it.label}
                      readOnly={!editable}
                      list={editable && products.length ? listId : undefined}
                      autoComplete="off"
                      onChange={(e) => setLabel(i, e.target.value)}
                      className={`${field} ${editable ? "col-span-2 sm:col-span-1" : "border-transparent bg-transparent px-0"}`}
                    />
                    <input
                      name="amount"
                      aria-label={`Bedrag regel ${i + 1} in euro`}
                      inputMode="decimal"
                      value={editable ? it.amount : formatEur(Number(it.amount))}
                      readOnly={!editable}
                      onChange={(e) => setAmount(i, e.target.value)}
                      className={`${field} tabular text-right ${editable ? "" : "border-transparent bg-transparent px-0"}`}
                    />
                    {editable ? (
                      <button
                        type="button"
                        aria-label={`Regel ${i + 1} verwijderen`}
                        onClick={() => setItems((l) => l.filter((_, j) => j !== i))}
                        className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <span aria-hidden="true">✕</span>
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                  <input type="hidden" name="qty" value={it.qty ?? ""} />
                  <input type="hidden" name="price" value={it.price ?? ""} />
                  <input type="hidden" name="unit" value={it.unit ?? ""} />
                  {it.price !== undefined &&
                    (editable ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                        <span>Aantal</span>
                        <span className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
                          <button type="button" aria-label={`Aantal van regel ${i + 1} verlagen`} onClick={() => setQty(i, String(Math.max(1, num(it.qty ?? "1") - 1)))} className="grid h-10 w-10 place-items-center text-lg text-foreground hover:bg-slate-50">
                            −
                          </button>
                          <input
                            aria-label={`Aantal regel ${i + 1}`}
                            inputMode="decimal"
                            value={it.qty ?? ""}
                            onChange={(e) => setQty(i, e.target.value)}
                            className="tabular h-10 w-14 border-x border-slate-300 bg-transparent text-center text-base text-foreground"
                          />
                          <button type="button" aria-label={`Aantal van regel ${i + 1} verhogen`} onClick={() => setQty(i, String(num(it.qty ?? "0") + 1))} className="grid h-10 w-10 place-items-center text-lg text-foreground hover:bg-slate-50">
                            +
                          </button>
                        </span>
                        <span className="tabular">
                          × {formatEur(it.price)} {it.unit}
                        </span>
                      </div>
                    ) : (
                      <p className="tabular text-sm text-muted">
                        {String(it.qty).replace(".", ",")} × {formatEur(it.price)} {it.unit}
                      </p>
                    ))}
                </li>
              ))}
            </ul>

            {editable && (
              <>
                <button
                  type="button"
                  onClick={() => setItems((l) => [...l, { id: `n${l.length}${Date.now()}`, label: "", amount: "0" }])}
                  className="mt-3 min-h-11 text-sm font-semibold text-brand hover:underline"
                >
                  + Regel toevoegen
                </button>
                {products.length > 0 && (
                  <>
                    <datalist id={listId}>
                      {products.map((p) => (
                        <option key={p.label} value={p.label}>{formatEur(p.amount)} {p.unit}</option>
                      ))}
                    </datalist>
                    <div className="mt-2">
                      <p className="text-sm text-muted">Snel toevoegen</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {products.slice(0, 8).map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => addProduct(p)}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm hover:border-brand hover:bg-brand-soft"
                          >
                            <span aria-hidden="true">+</span> {p.label}{" "}
                            <span className="tabular text-muted">
                              {formatEur(p.amount)} {p.unit}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <span className="font-semibold">Totaal incl. btw</span>
              <span className="tabular text-2xl font-semibold">{formatEur(total)}</span>
            </div>

            {state?.error && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {state.error}
              </p>
            )}
            {state?.ok && !dirty && (
              <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                Wijzigingen opgeslagen.
              </p>
            )}
            {editable && (
              <div className="mt-4">
                <SubmitButton variant="secondary" pending={pending} pendingText="Opslaan…">
                  Wijzigingen opslaan
                </SubmitButton>
              </div>
            )}
          </>
        )}
      </ActionForm>

      {approve && (
        <div className="mt-6 rounded-xl bg-brand-soft p-4">
          {!confirming ? (
            <>
              <p className="text-sm text-slate-700">{copy.hint}</p>
              <button
                type="button"
                disabled={dirty}
                onClick={() => setConfirming(true)}
                className={`${btn.primary} mt-3`}
              >
                {copy.approve}
              </button>
              {dirty && <p className="mt-2 text-sm text-amber-900">Sla uw wijzigingen eerst op voordat u goedkeurt.</p>}
            </>
          ) : (
            <form action={approve}>
              <p className="font-medium">{copy.question(formatEur(total), recipient)}</p>
              <p className="mt-1 text-sm text-slate-700">{copy.note}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <SubmitButton pendingText="Bezig…">{copy.yes}</SubmitButton>
                <button type="button" onClick={() => setConfirming(false)} className={btn.secondary}>
                  Annuleren
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
