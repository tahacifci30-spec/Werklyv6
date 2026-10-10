"use client";

import { useState } from "react";
import type { FormState } from "@/app/actions";
import { INSTALL_CHECKS, INSTALL_PIPE_OPTIONS } from "@/lib/dossier";
import { ActionForm } from "../ActionForm";
import { PhotoPicker } from "../PhotoPicker";
import { SubmitButton } from "../SubmitButton";
import { btn, field } from "../ui";

const chip =
  "flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-4 font-medium transition-[background-color,border-color,color,transform] duration-100 ease-out active:scale-[0.98] peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand";

/** Afrondscherm voor de installatiedag: wat is uitgevoerd, controles, serienummers, meerwerk en foto's. */
export function InstallForm({
  action,
  defaultUnits,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  defaultUnits: number;
}) {
  const [extras, setExtras] = useState<number[]>([]);

  return (
    <ActionForm action={action} className="space-y-7">
      {({ state, pending }) => (
        <>
          <fieldset>
            <legend className="mb-2 text-base font-semibold">Uitgevoerd volgens de offerte?</legend>
            <div className="flex flex-wrap gap-2">
              <label className="relative">
                <input type="radio" name="as_quoted" value="yes" className="peer sr-only" />
                <span className={chip}>Ja</span>
              </label>
              <label className="relative">
                <input type="radio" name="as_quoted" value="no" className="peer sr-only" />
                <span className={chip}>Nee, er is afgeweken</span>
              </label>
            </div>
          </fieldset>

          <div className="max-w-[10rem]">
            <label htmlFor="units" className="mb-1.5 block text-base font-semibold">
              Aantal units geplaatst
            </label>
            <input id="units" name="units" inputMode="numeric" defaultValue={defaultUnits} className={`${field} tabular`} />
          </div>

          <fieldset>
            <legend className="mb-2 text-base font-semibold">Werkelijke leidinglengte</legend>
            <div className="flex flex-wrap gap-2">
              {INSTALL_PIPE_OPTIONS.map((o) => (
                <label key={o.id} className="relative">
                  <input type="radio" name="pipe_length" value={o.id} className="peer sr-only" />
                  <span className={chip}>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-base font-semibold">Controle</legend>
            <ul className="space-y-1">
              {INSTALL_CHECKS.map((c) => (
                <li key={c.id}>
                  <label className="flex min-h-12 items-center gap-3 rounded-lg px-1 font-medium">
                    <input type="checkbox" name={c.id} className="h-6 w-6 shrink-0 accent-[#0f766e]" />
                    <span>{c.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div>
            <label htmlFor="serials" className="mb-1.5 block text-base font-semibold">
              Serienummers <span className="text-sm font-normal text-muted">(voor de garantie)</span>
            </label>
            <input id="serials" name="serials" className={field} placeholder="Binnenunit en buitenunit" />
          </div>

          <fieldset>
            <legend className="text-base font-semibold">Meerwerk</legend>
            <p className="mb-3 mt-0.5 text-sm text-muted">Alles wat niet in de offerte stond. Komt op de factuur.</p>
            <ul className="space-y-3">
              {extras.map((key, i) => (
                <li key={key} className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] items-center gap-2">
                  <input name="extra_label" aria-label={`Omschrijving meerwerk ${i + 1}`} placeholder="Omschrijving" className={field} />
                  <input name="extra_amount" aria-label={`Bedrag meerwerk ${i + 1} in euro`} inputMode="decimal" placeholder="€" className={`${field} tabular text-right`} />
                  <button
                    type="button"
                    aria-label={`Meerwerk ${i + 1} verwijderen`}
                    onClick={() => setExtras((l) => l.filter((k) => k !== key))}
                    className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </li>
              ))}
            </ul>
            {extras.length < 5 && (
              <button
                type="button"
                onClick={() => setExtras((l) => [...l, (l.at(-1) ?? 0) + 1])}
                className={`${btn.secondary} mt-3`}
              >
                + Meerwerk toevoegen
              </button>
            )}
          </fieldset>

          <PhotoPicker label="Foto's van het eindresultaat" help="Binnenunit, buitenunit en leidingwerk. Maximaal 6 foto's, samen niet groter dan 5 MB." />

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-base font-semibold">
              Notities
            </label>
            <textarea id="notes" name="notes" rows={3} className={field} />
          </div>

          {state?.error && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              <p>{state.error}</p>
              {state.error.includes("nog niet afgevinkt") && (
                <label className="mt-2 flex min-h-11 items-center gap-2 font-medium">
                  <input type="checkbox" name="confirm_incomplete" className="h-5 w-5" />
                  Rond toch af, zonder deze punten
                </label>
              )}
            </div>
          )}

          <SubmitButton pending={pending} pendingText="Afronden…" className="w-full">
            Installatie afronden
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
