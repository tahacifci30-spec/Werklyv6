"use client";

import { useState } from "react";
import { SubmitButton } from "./SubmitButton";
import { btn } from "./ui";

/** Knop die eerst om bevestiging vraagt voordat de actie wordt uitgevoerd. */
export function ConfirmForm({
  action,
  label,
  question,
  note,
  confirmLabel = "Ja, doorgaan",
  variant = "primary",
}: {
  action: () => Promise<void>;
  label: string;
  question: string;
  note?: string;
  confirmLabel?: string;
  variant?: keyof typeof btn;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={btn[variant]}>
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="rounded-xl bg-slate-50 p-4">
      <p className="font-medium">{question}</p>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <SubmitButton variant={variant} pendingText="Bezig…">
          {confirmLabel}
        </SubmitButton>
        <button type="button" onClick={() => setAsking(false)} className={btn.secondary}>
          Annuleren
        </button>
      </div>
    </form>
  );
}
