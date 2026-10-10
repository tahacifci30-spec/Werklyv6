"use client";

import { useState } from "react";
import { EntryForm } from "../agenda/AgendaCalendar";
import { btn } from "../ui";

/** Iemand voor meerdere dagen afmelden of ziek melden, met een reden. Voor één dag is het kruisje in het rooster sneller. */
export function OffPeriod({ today, team }: { today: string; team: { name: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={btn.secondary}>
        Meerdere dagen afmelden of ziek melden
      </button>
    );
  }
  return (
    <div className="max-w-md rounded-2xl border border-line bg-surface p-4">
      <EntryForm day={today} today={today} off owner me="Eigenaar" team={team} onBack={() => setOpen(false)} />
    </div>
  );
}
