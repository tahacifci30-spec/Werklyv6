"use client";

import { useState } from "react";
import { btn } from "./ui";

/** Kopieert een pad (of volledige URL) naar het klembord. Relatieve paden krijgen de huidige origin. */
export function CopyButton({
  value,
  label = "Kopiëren",
  className = btn.secondary,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    const text = value.startsWith("/") ? `${window.location.origin}${value}` : value;
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }
  return (
    <button type="button" onClick={copy} className={className}>
      <span aria-live="polite">
        {state === "copied" ? "Gekopieerd ✓" : state === "failed" ? "Kopiëren mislukt" : label}
      </span>
    </button>
  );
}

export function PrintButton({ label = "Afdrukken of opslaan als PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${btn.secondary} print:hidden`}>
      {label}
    </button>
  );
}
