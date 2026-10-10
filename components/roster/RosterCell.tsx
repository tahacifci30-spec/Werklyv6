"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleRosterDay } from "@/app/actions";

/**
 * Eén dag van één persoon in het rooster, met de knop om hem in of uit te roosteren.
 * De knop reageert direct: het vakje springt meteen om en toont dat het wordt opgeslagen. Zonder die reactie
 * lijkt het alsof er niets gebeurt en tikt men nog een keer, wat de wijziging weer terugdraait.
 */
export function RosterCell({
  who,
  first,
  date,
  href,
  title,
  label,
  works,
  off,
  pending: waiting,
  canToggle,
}: {
  who: string;
  first: string;
  date: string;
  href: string;
  title: string;
  /** Tekst in het vakje: aantal afspraken, "Ziek", "NB" of leeg */
  label: string;
  works: boolean;
  off: boolean;
  /** Er wacht een aanvraag van de monteur voor deze dag */
  pending: boolean;
  canToggle: boolean;
}) {
  const [busy, start] = useTransition();
  // Tijdens het opslaan tonen we alvast de nieuwe stand.
  const shownWorks = busy ? !works : works;
  const shownOff = busy ? false : off;
  const act = works ? `${first} uitroosteren op deze dag` : `${first} inroosteren op deze dag`;

  return (
    <div className="group relative">
      <Link
        href={href}
        title={title}
        className={`tabular grid h-11 place-items-center rounded-lg text-xs font-semibold transition-[background-color,color,transform] duration-100 active:scale-[0.96] sm:h-12 sm:text-sm ${
          shownOff ? "bg-red-100 text-red-800" : shownWorks ? "bg-brand-soft text-brand-strong" : "bg-background text-slate-400"
        } ${waiting ? "ring-2 ring-signal" : ""} ${busy ? "animate-pulse" : ""}`}
      >
        <span className="max-w-full truncate px-0.5">{busy ? (shownWorks ? "✓" : "–") : label || (works ? "✓" : "–")}</span>
      </Link>
      {canToggle ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => start(async () => toggleRosterDay(who, date))}
          aria-label={act}
          aria-busy={busy}
          title={act}
          // Op een scherm met muis verschijnt de knop bij aanwijzen in de hoek; op een telefoon staat hij onder het vakje.
          className={`absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-xs font-bold leading-none text-white opacity-0 shadow-sm transition-[opacity,transform] duration-100 hover:scale-110 focus-visible:opacity-100 active:scale-95 disabled:opacity-60 group-hover:opacity-100 sm:h-6 sm:w-6 sm:text-sm [@media(hover:none)]:static [@media(hover:none)]:mt-1 [@media(hover:none)]:h-8 [@media(hover:none)]:w-full [@media(hover:none)]:rounded-md [@media(hover:none)]:text-base [@media(hover:none)]:opacity-100 [@media(hover:none)]:shadow-none ${
            works
              ? "bg-red-600 [@media(hover:none)]:bg-red-50 [@media(hover:none)]:text-red-700"
              : "bg-brand [@media(hover:none)]:bg-brand-soft [@media(hover:none)]:text-brand-strong"
          }`}
        >
          <span aria-hidden="true">{busy ? "…" : works ? "×" : "+"}</span>
        </button>
      ) : (
        // Dagen in het verleden hebben geen knop; deze ruimte houdt de rijen op een telefoon recht.
        <span aria-hidden="true" className="hidden [@media(hover:none)]:mt-1 [@media(hover:none)]:block [@media(hover:none)]:h-8" />
      )}
    </div>
  );
}
