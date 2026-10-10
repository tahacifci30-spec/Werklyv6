import Link from "next/link";
import { addDays, dayShort } from "@/lib/dates";
import { weekNumber } from "@/lib/roster";

/** Bladeren per week: vorige, volgende en terug naar deze week. */
export function WeekNav({ base, monday, thisMonday }: { base: string; monday: string; thisMonday: string }) {
  const link = (d: string) => `${base}?w=${d}`;
  const arrow = "grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface hover:bg-slate-50 active:scale-[0.96]";
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-1 sm:w-auto sm:justify-start">
      <Link href={link(addDays(monday, -7))} className={arrow} aria-label="Vorige week">
        <span aria-hidden="true">←</span>
      </Link>
      <p className="min-w-44 px-2 text-center" aria-live="polite">
        <span className="block text-base font-semibold">Week {weekNumber(monday)}</span>
        <span className="block text-xs text-muted">
          {dayShort(monday)} t/m {dayShort(addDays(monday, 6))}
        </span>
      </p>
      <Link href={link(addDays(monday, 7))} className={arrow} aria-label="Volgende week">
        <span aria-hidden="true">→</span>
      </Link>
      {monday !== thisMonday && (
        <Link href={base} className="ml-1 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-brand hover:underline">
          Deze week
        </Link>
      )}
    </div>
  );
}
