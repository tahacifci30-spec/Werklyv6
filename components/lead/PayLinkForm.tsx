"use client";

import { useState, useTransition } from "react";
import { savePayLink } from "@/app/actions";
import { btn, field } from "../ui";

/**
 * Betaallink bij de factuur: plak een betaalverzoek van uw bank of Tikkie. De klant ziet dan een knop "Online betalen"
 * op de factuur. De betaling vinkt u daarna zelf af zodra het geld binnen is.
 */
export function PayLinkForm({ id, current }: { id: string; current?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" onClick={() => setOpen(true)} className={btn.secondary}>
          {current ? "Betaallink wijzigen" : "Betaallink toevoegen"}
        </button>
        <span className="text-muted">{current ? "De klant ziet de knop Online betalen op de factuur." : "Plak een betaalverzoek van uw bank of Tikkie."}</span>
      </div>
    );
  }
  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          const res = await savePayLink(id, undefined, data);
          setError(res?.error);
          if (res?.ok) setOpen(false);
        });
      }}
      className="space-y-3"
    >
      <div>
        <label htmlFor="pay-url" className="mb-1.5 block text-sm font-medium">Betaallink</label>
        <input id="pay-url" name="url" type="url" inputMode="url" defaultValue={current} autoComplete="off" spellCheck={false} className={field} placeholder="https://…" />
        <p className="mt-1 text-xs text-muted">Maak het betaalverzoek in uw bank-app en plak de link hier. Leeg laten haalt de knop weg.</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={btn.primary}>{pending ? "Opslaan…" : "Opslaan"}</button>
        <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>Annuleren</button>
      </div>
    </form>
  );
}
