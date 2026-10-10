"use client";

import { useState, useTransition } from "react";
import { closeLead } from "@/app/actions";
import { btn, field } from "../ui";

const REASONS = ["Klant reageert niet", "Klant ziet ervan af", "Dubbele aanvraag", "Buiten ons werkgebied", "Anders"];

/** Een aanvraag afsluiten die niet doorgaat, met de reden erbij. Zo blijft "Aan u" schoon. */
export function CloseLead({ id, name }: { id: string; name: string }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="min-h-11 text-sm font-medium text-muted underline decoration-line decoration-2 underline-offset-4 hover:text-red-700 hover:decoration-red-300">
        Aanvraag afsluiten
      </button>
    );
  }
  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        const reason = String(new FormData(e.currentTarget).get("reason"));
        start(async () => closeLead(id, reason));
      }}
      className="w-full rounded-xl bg-slate-50 p-4"
    >
      <p className="font-medium">Aanvraag van {name} afsluiten?</p>
      <p className="mt-1 text-sm text-muted">De aanvraag gaat naar Afgerond en een geplande afspraak vervalt. Dit kan niet worden teruggedraaid.</p>
      <label htmlFor="close-reason" className="mb-1.5 mt-3 block text-sm font-medium">Reden</label>
      <select id="close-reason" name="reason" className={`${field} max-w-xs`} defaultValue={REASONS[0]}>
        {REASONS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={btn.danger}>{pending ? "Bezig…" : "Ja, afsluiten"}</button>
        <button type="button" onClick={() => setAsking(false)} className={btn.secondary}>Annuleren</button>
      </div>
    </form>
  );
}
