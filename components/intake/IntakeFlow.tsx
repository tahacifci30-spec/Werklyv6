"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DONT_KNOW, findQuestion, isComplete, nextQuestion, optionLabel, totalQuestions } from "@/lib/intake/questions";
import { estimatePrice, formatRange } from "@/lib/pricing/engine";
import { durationLabel, estimateInstallDays } from "@/lib/duration";
import type { PricingRules } from "@/lib/pricing/rules";
import { PART_LABEL, dayShort } from "@/lib/dates";
import { UNKNOWN, type DayChoice } from "@/lib/types";
import { PhotoPicker } from "../PhotoPicker";
import { WhenPicker } from "../WhenPicker";
import { btn, field } from "../ui";

type Errors = Partial<
  Record<"name" | "email" | "phone" | "postcode" | "street" | "city" | "consent" | "photos" | "company" | "preferred", string>
>;

const STORAGE_KEY = "werkly.intake.v1";

export function IntakeFlow({
  companyName,
  phone,
  rules,
}: {
  companyName: string;
  phone: string;
  rules: PricingRules;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [preferred, setPreferred] = useState<DayChoice | undefined>();
  const [postcode, setPostcode] = useState("");
  const [business, setBusiness] = useState(false);
  const [houseNumber, setHouseNumber] = useState("");
  const [streetName, setStreetName] = useState("");
  const [city, setCity] = useState("");
  const [lookup, setLookup] = useState<"idle" | "busy" | "found" | "missing">("idle");
  const heading = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);

  const form = rules.form;
  const total = totalQuestions(form, answers);
  const question = nextQuestion(form, answers);
  const complete = isComplete(form, answers);
  const step = Math.min(order.length + 1, total);
  const estimate = complete ? estimatePrice(answers, rules) : null;
  const hasUnknown = Object.values(answers).includes(UNKNOWN);

  // Hervat een onderbroken formulier (alleen in deze browser, alleen antwoorden, geen contactgegevens).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
        if (saved?.order?.length) {
          setAnswers(saved.answers);
          setOrder(saved.order);
          setStarted(true);
        }
      } catch {}
      restored.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      if (done || order.length === 0) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, order }));
    } catch {}
  }, [answers, order, done]);

  // Straat en woonplaats automatisch invullen op basis van postcode en huisnummer (PDOK, gratis overheidsdienst).
  const pc = postcode.replace(/\s/g, "").toUpperCase();
  const nr = houseNumber.trim().match(/^\d+/)?.[0];
  const ready = /^[1-9]\d{3}[A-Z]{2}$/.test(pc) && !!nr;
  const addressStatus = ready ? lookup : "idle";

  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLookup("busy");
      const base = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?fq=type:adres&rows=1&fl=straatnaam,woonplaatsnaam";
      try {
        for (const q of [`postcode:${pc} AND huisnummer:${nr}`, `postcode:${pc}`]) {
          const res = await fetch(`${base}&q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
          const doc = (await res.json())?.response?.docs?.[0];
          if (doc?.straatnaam) {
            setStreetName(doc.straatnaam);
            setCity(doc.woonplaatsnaam ?? "");
            setLookup("found");
            return;
          }
        }
        setLookup("missing");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setLookup("missing");
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [ready, pc, nr]);

  useEffect(() => {
    if (started) heading.current?.focus();
  }, [order.length, started, complete, done]);

  function choose(qid: string, optionId: string) {
    setAnswers((a) => ({ ...a, [qid]: optionId }));
    setOrder((o) => [...o, qid]);
  }

  function back() {
    const last = order[order.length - 1];
    if (!last) return setStarted(false);
    setAnswers((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== last)));
    setOrder((o) => o.slice(0, -1));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setFormError("");
    setErrors({});

    const body = new FormData();
    body.set(
      "payload",
      JSON.stringify({
        answers,
        website: form.get("website"),
        consent: form.get("consent") === "on",
        preferred: preferred ? { first: preferred } : undefined,
        customer: {
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          postcode,
          street: `${streetName.trim()} ${houseNumber.trim()}`.trim(),
          city,
          business,
          company: form.get("company"),
        },
      }),
    );
    for (const f of form.getAll("photos")) if (f instanceof File && f.size > 0) body.append("photos", f);

    try {
      const res = await fetch("/api/intake", { method: "POST", body });
      const data = await res.json();
      if (res.status === 422) {
        setErrors(data.errors ?? {});
        requestAnimationFrame(() =>
          (document.querySelector("[aria-invalid=true]") as HTMLElement | null)?.focus(),
        );
      } else if (!res.ok) setFormError(data.error ?? "Er ging iets mis. Probeer het opnieuw.");
      else setDone(true);
    } catch {
      setFormError("Geen verbinding. Controleer uw internet en probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Start ---------- */
  if (!started) {
    return (
      <div className="rise text-center">
        <p className="text-sm font-medium text-brand">{companyName}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Airco nodig?</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Beantwoord {total} korte vragen en zie direct een prijsindicatie. U hoeft niets te typen.
        </p>
        <button type="button" onClick={() => setStarted(true)} className={`${btn.primary} mt-8 px-8`}>
          Start
        </button>
        <ul className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted">
          <li>Duurt ongeveer een minuut</li>
          <li>Vrijblijvend</li>
          <li>Geen account nodig</li>
        </ul>
      </div>
    );
  }

  /* ---------- Bevestiging ---------- */
  if (done) {
    return (
      <div className="rise text-center" role="status">
        <svg viewBox="0 0 52 52" className="mx-auto h-16 w-16 text-emerald-600" aria-hidden="true">
          <circle className="done-circle" cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="3" />
          <path className="done-tick" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M15 27l8 8 14-16" />
        </svg>
        <h1 ref={heading} tabIndex={-1} className="mt-5 text-2xl font-semibold outline-none">
          Aanvraag ontvangen
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          {companyName} belt u om het bezoek af te spreken
          {preferred ? `, het liefst op uw voorkeur: ${dayShort(preferred.date)} in de ${PART_LABEL[preferred.part]}` : ""}. Uw prijsindicatie:{" "}
          <strong className="tabular text-foreground">{estimate && formatRange(estimate)}</strong>.
        </p>
        <Disclaimer className="mx-auto mt-4 max-w-md text-left" />
        <NextSteps />
        <p className="mt-6 text-sm text-muted">
          Vragen? Bel {companyName} op{" "}
          <a className="font-medium text-brand underline" href={`tel:${phone.replace(/\s/g, "")}`}>
            {phone}
          </a>
          .
        </p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-semibold text-foreground hover:bg-slate-50 active:scale-[0.97]">
          Terug naar de startpagina
        </Link>
      </div>
    );
  }

  /* ---------- Resultaat + gegevens ---------- */
  if (complete && estimate) {
    return (
      <div className="rise">
        <button type="button" onClick={back} className="mb-2 inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-foreground">
          ← Antwoord aanpassen
        </button>
        <div className="rounded-2xl bg-brand-soft p-6 text-center">
          <p className="text-sm font-medium text-brand-strong">Uw prijsindicatie</p>
          <h1 ref={heading} tabIndex={-1} className="tabular mt-1 text-3xl font-semibold tracking-tight outline-none sm:text-4xl">
            {formatRange(estimate)}
          </h1>
          <p className="mt-2 text-sm text-slate-700">Op basis van uw antwoorden, inclusief montage en btw.</p>
          <p className="mt-1 text-sm font-medium text-slate-800">Het plaatsen duurt naar verwachting {durationLabel(estimateInstallDays(answers))}.</p>
          {hasUnknown && (
            <p className="mt-3 text-sm text-slate-700">
              Geen probleem dat u niet alles wist. De monteur controleert dit bij het bezoek.
            </p>
          )}
        </div>
        <Disclaimer className="mt-3" />

        <details className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <summary className="min-h-8 font-medium">Uw antwoorden</summary>
          <dl className="mt-3 space-y-1.5">
            {order.map((q) => (
              <div key={q} className="flex justify-between gap-4">
                <dt className="min-w-0 text-muted">{(findQuestion(form, q)?.title ?? q).replace(/\?$/, "")}</dt>
                <dd className="shrink-0 text-right font-medium">{optionLabel(form, q, answers[q])}</dd>
              </div>
            ))}
          </dl>
        </details>

        <form onSubmit={submit} noValidate className="mt-6 space-y-5">
          <h2 className="text-lg font-semibold">Waar mogen we de aanvraag naartoe sturen?</h2>
          <Field label="Naam" name="name" autoComplete="name" error={errors.name} />
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={business} onChange={(e) => setBusiness(e.target.checked)} className="h-5 w-5" />
            Ik vraag dit aan voor een bedrijf
          </label>
          {business && <Field label="Naam van het bedrijf" name="company" autoComplete="organization" error={errors.company} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="E-mailadres" name="email" type="email" autoComplete="email" inputMode="email" spellCheck={false} error={errors.email} />
            <Field label="Telefoonnummer" name="phone" type="tel" autoComplete="tel" inputMode="tel" error={errors.phone} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Postcode"
              name="postcode"
              autoComplete="postal-code"
              placeholder="5141 AB"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              error={errors.postcode}
            />
            <Field
              label="Huisnummer"
              name="housenumber"
              autoComplete="off"
              inputMode="numeric"
              placeholder="12"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              error={errors.street && !streetName.trim() ? undefined : errors.street}
            />
          </div>
          <p aria-live="polite" className={`-mt-2 text-sm ${addressStatus === "found" ? "text-emerald-800" : "text-muted"}`}>
            {addressStatus === "busy" && "Adres opzoeken…"}
            {addressStatus === "found" && "Adres gevonden. Klopt het niet? Pas het hieronder aan."}
            {addressStatus === "missing" && "Adres niet gevonden. Vul de straat en woonplaats zelf in."}
            {addressStatus === "idle" && "Vul uw postcode en huisnummer in: de straat en woonplaats vullen we automatisch in."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Straat" name="streetname" autoComplete="off" value={streetName} onChange={(e) => setStreetName(e.target.value)} error={!streetName.trim() ? errors.street : undefined} />
            <Field label="Woonplaats" name="city" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} />
          </div>

          <fieldset className="min-w-0 space-y-3">
            <legend className="text-base font-semibold">Wanneer komt de monteur het liefst langs?</legend>
            <p className="text-sm text-muted">
              Kies één dag en ochtend of middag. {companyName} belt u daarna om de afspraak vast te leggen. Geen voorkeur? Sla dit over.
            </p>
            <WhenPicker label="Uw voorkeur" value={preferred} onChange={setPreferred} />
            {preferred && (
              <p className="text-sm font-medium text-brand-strong">
                Uw voorkeur: {dayShort(preferred.date)}, {PART_LABEL[preferred.part]}
              </p>
            )}
            {errors.preferred && <p className="text-sm text-red-700">{errors.preferred}</p>}
          </fieldset>

          <PhotoPicker
            label="Foto van de plek (optioneel)"
            help="Waar komt de airco en waar kan de buitenunit komen? Dat scheelt een telefoontje. Samen maximaal 5 MB."
          />
          {errors.photos && <p className="-mt-3 text-sm text-red-700">{errors.photos}</p>}

          {/* Honeypot */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

          <div>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="consent"
                aria-invalid={!!errors.consent}
                aria-describedby={errors.consent ? "consent-err" : undefined}
                className="mt-0.5 h-5 w-5 shrink-0"
              />
              <span>
                Ik geef {companyName} toestemming mijn gegevens te gebruiken om mijn aanvraag te beoordelen en contact met mij
                op te nemen. Lees de{" "}
                <Link href="/privacy" target="_blank" className="font-medium text-brand underline">
                  privacyverklaring
                </Link>
                .
              </span>
            </label>
            {errors.consent && (
              <p id="consent-err" className="mt-1 text-sm text-red-700">
                {errors.consent}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {formError}
            </p>
          )}
          <button type="submit" disabled={busy} aria-busy={busy} className={`${btn.primary} w-full`}>
            {busy ? "Versturen…" : "Aanvraag versturen"}
          </button>
          <NextSteps compact />
        </form>
      </div>
    );
  }

  /* ---------- Vraag ---------- */
  const q = question ?? form[0];
  const options = [...q.options, DONT_KNOW];
  return (
    <div key={q.id} className="rise">
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={back} className="inline-flex min-h-11 items-center font-medium text-muted hover:text-foreground">
            ← Terug
          </button>
          <span className="font-medium text-muted" aria-live="polite">
            Vraag {step} van {total}
          </span>
        </div>
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
          aria-label="Voortgang"
        >
          <div className="h-full origin-left rounded-full bg-brand transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ transform: `scaleX(${step / total})` }} />
        </div>
      </div>

      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl">
        {q.title}
      </h1>
      {q.help && <p className="mt-2 text-muted">{q.help}</p>}

      <div role="group" aria-label={q.title} className="mt-6 grid gap-3 sm:grid-cols-2">
        {options.map((o: { id: string; label: string; hint?: string }) => {
          const unknown = o.id === UNKNOWN;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => choose(q.id, o.id)}
              className={`min-h-16 rounded-xl border px-4 py-3 text-left transition-[background-color,border-color,color,transform] duration-100 ease-out active:scale-[0.98] hover:border-brand hover:bg-brand-soft ${
                unknown ? "border-dashed border-slate-300 bg-transparent text-muted sm:col-span-2" : "border-line bg-surface shadow-sm"
              }`}
            >
              <span className="block font-semibold">{o.label}</span>
              {o.hint && <span className="block text-sm text-muted">{o.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Altijd zichtbaar bij de prijs: de indicatie is geen offerte. */
function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 ${className}`}>
      <strong>Let op:</strong> dit is een prijsindicatie en geen offerte. Na het bezoek van de monteur kan de definitieve offerte hoger of lager uitvallen.
    </p>
  );
}

function NextSteps({ compact = false }: { compact?: boolean }) {
  const steps = ["Wij bellen u om een afspraak te maken", "De monteur komt langs voor een korte controle", "U ontvangt een offerte op maat"];
  return (
    <ol className={`${compact ? "mt-2 text-left" : "mx-auto mt-6 max-w-sm text-left"} space-y-2 text-sm`}>
      <li className={`list-none ${compact ? "font-medium text-muted" : "font-semibold"}`}>Hoe gaat het verder?</li>
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">
            {i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}

function Field({
  label,
  name,
  error,
  help,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  help?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        required
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : help ? `${id}-help` : undefined}
        className={`${field} ${error ? "border-red-500" : ""}`}
        {...rest}
      />
      {help && !error && (
        <p id={`${id}-help`} className="mt-1 text-sm text-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
