"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import type { FormState } from "@/app/actions";

/**
 * Formulier voor server actions dat zijn invoer BEHOUDT bij een fout.
 * React 19 wist een `<form action={fn}>` na elke actie; bij een validatiefout
 * raakt de gebruiker dan zijn invoer kwijt. Hier versturen we de FormData zelf.
 */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: (ctx: { state: FormState; pending: boolean }) => React.ReactNode;
  className?: string;
}) {
  const [state, run, actionPending] = useActionState(action, undefined);
  const [transitionPending, startTransition] = useTransition();
  const pending = actionPending || transitionPending;
  const ref = useRef<HTMLFormElement>(null);

  // Na een fout: zet de focus op het eerste ongeldige veld of anders op de melding.
  useEffect(() => {
    if (!state?.error) return;
    const el = ref.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
    if (!el) return;
    if (!el.matches("input, select, textarea")) el.tabIndex = -1;
    el.focus();
  }, [state]);

  return (
    <form
      ref={ref}
      // Zonder JS/hydratatie mag een native submit nooit invoer (bv. een wachtwoord) in de URL zetten.
      method="post"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          await run(data);
        });
      }}
    >
      {children({ state, pending })}
    </form>
  );
}
