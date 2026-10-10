"use client";

import { useEffect, useState } from "react";
import { addLead } from "@/app/actions";
import type { FormQuestion } from "@/lib/pricing/rules";
import { UNKNOWN } from "@/lib/types";
import { ActionForm } from "../ActionForm";
import { SubmitButton } from "../SubmitButton";
import { field } from "../ui";

/**
 * Zelf een aanvraag toevoegen, bijvoorbeeld als een klant belt. Alleen naam en telefoonnummer zijn nodig om te beginnen;
 * wat u nog niet weet laat u op "Weet ik nog niet" staan en vult de monteur bij het bezoek aan.
 */
export function NewLeadForm({ form }: { form: FormQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [postcode, setPostcode] = useState("");
  const [number, setNumber] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [lookup, setLookup] = useState<"idle" | "found" | "missing">("idle");

  // Straat en woonplaats opzoeken bij postcode en huisnummer (PDOK), net als in het klantformulier.
  const pc = postcode.replace(/\s/g, "").toUpperCase();
  const nr = number.trim().match(/^\d+/)?.[0];
  const ready = /^[1-9]\d{3}[A-Z]{2}$/.test(pc) && !!nr;
  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        // Eerst het precieze adres; staat het huisnummer er niet in, dan de straat bij de postcode.
        const base = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?fq=type:adres&rows=1&fl=straatnaam,woonplaatsnaam";
        for (const query of [`postcode:${pc} AND huisnummer:${nr}`, `postcode:${pc}`]) {
          const doc = (await (await fetch(`${base}&q=${encodeURIComponent(query)}`, { signal: ctrl.signal })).json())?.response?.docs?.[0];
          if (doc?.straatnaam) {
            setStreet(doc.straatnaam);
            setCity(doc.woonplaatsnaam ?? "");
            setLookup("found");
            return;
          }
        }
        setLookup("missing");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setLookup("missing");
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [ready, pc, nr]);

  const visible = form.filter((q) => !q.showIf || q.showIf.in.includes(answers[q.showIf.question] ?? ""));

  return (
    <ActionForm action={addLead} className="space-y-6">
      {({ state, pending }) => (
        <>
          <fieldset className="min-w-0 space-y-4">
            <legend className="text-base font-semibold">Klant</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="n-name" className="mb-1.5 block text-sm font-medium">Naam</label>
                <input id="n-name" name="name" required autoComplete="off" className={field} />
              </div>
              <div>
                <label htmlFor="n-phone" className="mb-1.5 block text-sm font-medium">Telefoonnummer</label>
                <input id="n-phone" name="phone" type="tel" inputMode="tel" required autoComplete="off" className={field} />
              </div>
              <div>
                <label htmlFor="n-email" className="mb-1.5 block text-sm font-medium">E-mailadres</label>
                <input id="n-email" name="email" type="email" inputMode="email" spellCheck={false} autoComplete="off" className={field} placeholder="Mag later" />
              </div>
              <div>
                <label htmlFor="n-company" className="mb-1.5 block text-sm font-medium">Bedrijf</label>
                <input id="n-company" name="company" autoComplete="off" className={field} placeholder="Leeg = particulier" />
              </div>
              <div>
                <label htmlFor="n-postcode" className="mb-1.5 block text-sm font-medium">Postcode</label>
                <input id="n-postcode" name="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} autoComplete="off" className={field} placeholder="5141 AB" />
              </div>
              <div>
                <label htmlFor="n-number" className="mb-1.5 block text-sm font-medium">Huisnummer</label>
                <input id="n-number" name="number" value={number} onChange={(e) => setNumber(e.target.value)} autoComplete="off" className={field} placeholder="12" />
              </div>
              <div>
                <label htmlFor="n-street" className="mb-1.5 block text-sm font-medium">Straat</label>
                <input id="n-street" name="street" value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="off" className={field} />
              </div>
              <div>
                <label htmlFor="n-city" className="mb-1.5 block text-sm font-medium">Woonplaats</label>
                <input id="n-city" name="city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="off" className={field} />
              </div>
            </div>
            <p aria-live="polite" className={`text-sm ${ready && lookup === "found" ? "text-emerald-800" : "text-muted"}`}>
              {ready && lookup === "found"
                ? "Adres gevonden."
                : ready && lookup === "missing"
                  ? "Adres niet gevonden. Vul straat en woonplaats zelf in."
                  : "Vul postcode en huisnummer in: straat en woonplaats komen vanzelf. Het adres mag ook later."}
            </p>
          </fieldset>

          <fieldset className="min-w-0 space-y-4">
            <legend className="text-base font-semibold">Wat de klant wil</legend>
            <p className="text-sm text-muted">Dezelfde vragen als in het klantformulier. Hiermee rekent Werkly de prijsindicatie uit.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {visible.map((q) => (
                <div key={q.id}>
                  <label htmlFor={`a-${q.id}`} className="mb-1.5 block text-sm font-medium">{q.short}</label>
                  <select
                    id={`a-${q.id}`}
                    name={`a-${q.id}`}
                    value={answers[q.id] ?? UNKNOWN}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    className={field}
                  >
                    <option value={UNKNOWN}>Weet ik nog niet</option>
                    {q.options.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="n-note" className="mb-1.5 block text-sm font-medium">Notitie</label>
            <textarea id="n-note" name="note" rows={3} maxLength={1000} className={field} placeholder="Bijvoorbeeld: belt liever na 17:00" />
          </div>

          {state?.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
          <SubmitButton pending={pending} pendingText="Toevoegen…">Aanvraag toevoegen en inplannen</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
