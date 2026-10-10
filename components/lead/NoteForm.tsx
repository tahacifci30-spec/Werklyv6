"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions";
import { SubmitButton } from "../SubmitButton";
import { field } from "../ui";

export function NoteForm({ action }: { action: (state: FormState, form: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="mt-4">
      <label htmlFor="note" className="mb-1.5 block text-sm font-medium">
        Notitie toevoegen
      </label>
      <textarea id="note" name="text" rows={2} maxLength={1000} className={field} placeholder="Bijvoorbeeld: klant liever na 17:00 bellen" />
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="mt-2">
        <SubmitButton variant="secondary" pendingText="Opslaan…">
          Notitie opslaan
        </SubmitButton>
      </div>
    </form>
  );
}
