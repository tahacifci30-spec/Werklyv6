"use client";

import { useState, useTransition } from "react";
import { saveCustomer } from "@/app/actions";
import type { Customer } from "@/lib/types";
import { btn, field } from "../ui";

/**
 * De klant in het dossier: gegevens, bellen, mailen en route, en een knop om een typfout te verbeteren.
 * Eén plek voor alles over de klant; er is geen apart tabblad meer.
 */
export function CustomerCard({ id, customer, extra }: { id: string; customer: Customer; extra: [string, string][] }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const address = `${customer.street}, ${customer.postcode} ${customer.city}`;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  if (editing) {
    const submit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      start(async () => {
        const res = await saveCustomer(id, undefined, data);
        setError(res?.error);
        if (res?.ok) setEditing(false);
      });
    };
    const input = (name: keyof Customer, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
      <div>
        <label htmlFor={`c-${name}`} className="mb-1.5 block text-sm font-medium">{label}</label>
        <input id={`c-${name}`} name={name} defaultValue={customer[name] ?? ""} autoComplete="off" className={field} {...props} />
      </div>
    );
    return (
      <form onSubmit={submit} method="post" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {input("name", "Naam", { required: true })}
          {input("company", "Bedrijf (leeg = particulier)")}
          {input("phone", "Telefoonnummer", { type: "tel", inputMode: "tel", required: true })}
          {input("email", "E-mailadres", { type: "email", inputMode: "email", spellCheck: false })}
          {input("street", "Straat en huisnummer", { required: true })}
          {input("postcode", "Postcode", { required: true })}
          {input("city", "Woonplaats", { required: true })}
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={btn.primary}>{pending ? "Opslaan…" : "Opslaan"}</button>
          <button type="button" onClick={() => setEditing(false)} className={btn.secondary}>Annuleren</button>
        </div>
      </form>
    );
  }

  const rows: [string, string][] = [
    ["Naam", customer.name],
    ["Telefoon", customer.phone],
    ["E-mail", customer.email || "Niet opgegeven"],
    ["Adres", address],
    ...extra,
  ];
  return (
    <>
      <dl className="space-y-2.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">{k}</dt>
            <dd className="min-w-0 break-words text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <a className={btn.secondary} href={`tel:${customer.phone.replace(/\s/g, "")}`}>Bellen</a>
        {customer.email && <a className={btn.secondary} href={`mailto:${customer.email}`}>E-mailen</a>}
        <a className={btn.secondary} href={maps} target="_blank" rel="noopener noreferrer">Route ↗</a>
        <button type="button" onClick={() => setEditing(true)} className={btn.secondary}>Gegevens wijzigen</button>
      </div>
    </>
  );
}
