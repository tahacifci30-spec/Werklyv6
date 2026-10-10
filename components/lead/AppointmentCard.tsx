"use client";

import Link from "next/link";
import { useState } from "react";
import { btn } from "../ui";

/**
 * Bevestiging van een ingeplande afspraak, met een groen vinkje dat zichzelf tekent.
 * De planningsvelden zijn verborgen tot de eigenaar op "Afspraak wijzigen" klikt.
 */
export function AppointmentCard({
  title,
  detail,
  celebrate = false,
  agendaHref,
  children,
}: {
  title: string;
  detail: string;
  /** Alleen direct na het inplannen tekent het vinkje zich; daarna staat het er gewoon. */
  celebrate?: boolean;
  /** Link naar de agenda op de dag van de afspraak */
  agendaHref?: string;
  /** Het planformulier dat bij "wijzigen" verschijnt */
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-200">
        <svg viewBox="0 0 52 52" className="h-12 w-12 shrink-0" aria-hidden="true">
          <circle className={celebrate ? "check-circle" : undefined} cx="26" cy="26" r="23" fill="none" stroke="#059669" strokeWidth="3" />
          <path className={celebrate ? "check-tick" : undefined} fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M15 27l8 8 14-16" />
        </svg>
        <div className="min-w-0 flex-1" role="status">
          <p className="font-semibold text-emerald-900">{title}</p>
          <p className="break-words text-sm text-emerald-900">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {agendaHref && (
            <Link href={agendaHref} className={btn.secondary}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
              </svg>
              Bekijk in agenda
            </Link>
          )}
          <button type="button" aria-expanded={editing} onClick={() => setEditing((e) => !e)} className={btn.secondary}>
            {editing ? "Sluiten" : "Afspraak wijzigen"}
          </button>
        </div>
      </div>
      {editing && <div className="mt-5">{children}</div>}
    </div>
  );
}
