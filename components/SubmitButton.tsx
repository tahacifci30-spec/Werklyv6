"use client";

import { useFormStatus } from "react-dom";
import { btn } from "./ui";

/**
 * Verzendknop met laadstatus. Binnen een `<form action>` leest hij de status zelf uit;
 * binnen `ActionForm` geef je `pending` expliciet mee.
 */
export function SubmitButton({
  children,
  pendingText = "Bezig…",
  variant = "primary",
  className = "",
  pending: pendingProp,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: keyof typeof btn;
  className?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${btn[variant]} ${className}`}>
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {pending ? pendingText : children}
    </button>
  );
}
