"use client";

import { login } from "@/app/actions";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";
import { field } from "./ui";

export function LoginForm() {
  return (
    <ActionForm action={login} className="mt-6 space-y-4">
      {({ state, pending }) => (
        <>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          E-mailadres
        </label>
        <input id="email" name="email" type="email" required autoComplete="username" spellCheck={false} className={field} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Wachtwoord
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={field} />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <SubmitButton pending={pending} pendingText="Inloggen…" className="w-full">
        Inloggen
      </SubmitButton>
    </>
      )}
    </ActionForm>
  );
}
