"use client";

import type { FormState } from "@/app/actions";
import { TECH_KEYS, TECH_OPTIONS } from "@/lib/dossier";
import { UNKNOWN, type TechCheck } from "@/lib/types";
import { ActionForm } from "../ActionForm";
import { PhotoPicker } from "../PhotoPicker";
import { SubmitButton } from "../SubmitButton";
import { field } from "../ui";

const chip =
  "flex min-h-12 items-center rounded-xl border px-4 font-medium transition-[background-color,border-color,color,transform] duration-100 ease-out active:scale-[0.98] peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand";

/** Checklist voor het eerste bezoek (opname). */
export function TechForm({
  action,
  check,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  check: TechCheck;
}) {
  return (
    <ActionForm action={action} className="space-y-6">
      {({ state, pending }) => (
        <>
          {TECH_KEYS.map((key) => {
            const def = TECH_OPTIONS[key];
            const current = check[key].value;
            return (
              <fieldset key={key}>
                <legend className="mb-2 text-base font-semibold">{def.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {def.options.map((o) => (
                    <label key={o.id} className="relative">
                      <input type="radio" name={key} value={o.id} defaultChecked={current === o.id} className="peer sr-only" />
                      <span className={`${chip} border-slate-300 bg-white peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white`}>
                        {o.label}
                      </span>
                    </label>
                  ))}
                  <label className="relative">
                    <input type="radio" name={key} value={UNKNOWN} defaultChecked={current === UNKNOWN} className="peer sr-only" />
                    <span className={`${chip} border-dashed border-slate-300 text-muted peer-checked:border-slate-500 peer-checked:bg-slate-100`}>
                      Nog onbekend
                    </span>
                  </label>
                </div>
              </fieldset>
            );
          })}

          <PhotoPicker label="Foto's toevoegen" help="Maximaal 6 foto's, samen niet groter dan 5 MB." />

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-base font-semibold">
              Notities
            </label>
            <textarea id="notes" name="notes" rows={4} defaultValue={check.notes} className={field} />
          </div>

          {state?.error && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              <p>{state.error}</p>
              {state.error.includes("nog niet ingevuld") && (
                <label className="mt-2 flex min-h-11 items-center gap-2 font-medium">
                  <input type="checkbox" name="confirm_incomplete" className="h-5 w-5" />
                  Rond toch af, de rest blijft onbekend
                </label>
              )}
            </div>
          )}

          <SubmitButton pending={pending} pendingText="Afronden…" className="w-full">
            Bezoek afronden
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
