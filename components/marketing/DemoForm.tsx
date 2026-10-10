"use client";

import { useEffect, useState } from "react";
import { getCallSlots, requestDemo } from "@/app/actions";
import { ActionForm } from "../ActionForm";
import { SubmitButton } from "../SubmitButton";
import { field } from "../ui";

type Slots = { date: string; label: string; times: string[] }[];

/**
 * Een gesprek inplannen. De bezoeker kiest zelf een vrij moment; dat komt uit onze agenda en staat er daarna direct in.
 * Laden de momenten niet, dan kan het formulier nog steeds verstuurd worden en bellen wij voor een afspraak.
 */
export function DemoForm() {
  const [slots, setSlots] = useState<Slots | null>(null);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    let alive = true;
    getCallSlots()
      .then((s) => {
        if (!alive) return;
        setSlots(s);
        setDay(s[0]?.date ?? "");
      })
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, []);

  const chosen = slots?.find((s) => s.date === day);

  return (
    <ActionForm action={requestDemo} className="min-w-0 space-y-4 rounded-2xl bg-white p-6 text-left text-slate-900">
      {({ state, pending }) =>
        state?.ok ? (
          <div role="status">
            <h3 className="text-lg font-semibold">{time && chosen ? "Uw gesprek staat ingepland." : "Bedankt, we nemen contact met u op."}</h3>
            <p className="mt-2 text-sm text-slate-700">
              {time && chosen ? (
                <>
                  Wij bellen u op <strong className="inline-block first-letter:uppercase">{chosen.label}</strong> om <strong>{time}</strong>. Het gesprek duurt ongeveer een half uur.
                </>
              ) : (
                "Binnen één werkdag bellen we u om samen een gesprek in te plannen."
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="d-name" className="mb-1.5 block text-sm font-medium">Naam</label>
                <input id="d-name" name="name" required autoComplete="name" className={field} />
              </div>
              <div>
                <label htmlFor="d-company" className="mb-1.5 block text-sm font-medium">Bedrijf</label>
                <input id="d-company" name="company" required autoComplete="organization" className={field} />
              </div>
              <div>
                <label htmlFor="d-email" className="mb-1.5 block text-sm font-medium">Zakelijk e-mailadres</label>
                <input id="d-email" name="email" type="email" required autoComplete="email" spellCheck={false} className={field} />
              </div>
              <div>
                <label htmlFor="d-phone" className="mb-1.5 block text-sm font-medium">Telefoonnummer</label>
                <input id="d-phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" className={field} />
              </div>
            </div>
            <div>
              <label htmlFor="d-plan" className="mb-1.5 block text-sm font-medium">Waar bent u in geïnteresseerd?</label>
              <select id="d-plan" name="plan" className={field} defaultValue="onbekend">
                <option value="start">Start</option>
                <option value="team">Team</option>
                <option value="bedrijf">Bedrijf</option>
                <option value="onbekend">Dat weet ik nog niet</option>
              </select>
            </div>

            {/* min-w-0: een fieldset wordt anders zo breed als de rij met dagen en duwt de pagina uit beeld */}
            <fieldset className="min-w-0">
              <legend className="text-sm font-medium">Kies een moment voor het gesprek</legend>
              <p className="mt-0.5 text-xs text-slate-600">Telefonisch, ongeveer een half uur. U ziet alleen momenten waarop wij vrij zijn.</p>
              <input type="hidden" name="slot" value={day && time ? `${day}|${time}` : ""} />
              {slots === null ? (
                <p className="mt-3 text-sm text-slate-600" role="status">Vrije momenten laden…</p>
              ) : slots.length === 0 ? (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Er zijn nu geen vrije momenten te tonen. Verstuur het formulier; wij bellen u voor een afspraak.</p>
              ) : (
                <>
                  <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]" role="group" aria-label="Dag">
                    {slots.map((s) => {
                      const on = s.date === day;
                      const [weekday, num, month] = s.label.split(" ");
                      return (
                        <button
                          key={s.date}
                          type="button"
                          aria-pressed={on}
                          onClick={() => {
                            setDay(s.date);
                            setTime("");
                          }}
                          className={`min-h-16 min-w-[4.5rem] shrink-0 rounded-xl border px-2 py-1.5 text-center transition-colors duration-100 active:scale-[0.97] ${
                            on ? "border-brand bg-brand text-white" : "border-slate-300 bg-white hover:border-brand"
                          }`}
                        >
                          <span className="block text-xs">{weekday.slice(0, 2)}</span>
                          <span className="tabular block text-lg font-semibold leading-tight">{num}</span>
                          <span className="block text-xs">{month.slice(0, 3)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Tijd">
                    {chosen?.times.map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={time === t}
                        onClick={() => setTime(time === t ? "" : t)}
                        className={`tabular min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors duration-100 active:scale-[0.97] ${
                          time === t ? "border-brand bg-brand text-white" : "border-slate-300 bg-white hover:border-brand"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-slate-700" aria-live="polite">
                    {time && chosen ? (
                      <>
                        Gekozen: <strong className="inline-block first-letter:uppercase">{chosen.label}</strong> om <strong>{time}</strong>.
                      </>
                    ) : (
                      "Kies een dag en een tijd. Past er niets? Verstuur zonder moment, dan bellen wij u."
                    )}
                  </p>
                </>
              )}
            </fieldset>

            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                Ik geef toestemming om contact met mij op te nemen over dit gesprek. Zie de{" "}
                <a href="/privacy" className="font-medium text-brand underline">privacyverklaring</a>.
              </span>
            </label>
            {state?.error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {state.error}
              </p>
            )}
            <SubmitButton pending={pending} pendingText="Versturen…" className="w-full">
              {time ? "Gesprek inplannen" : "Verstuur, bel mij voor een afspraak"}
            </SubmitButton>
          </>
        )
      }
    </ActionForm>
  );
}
