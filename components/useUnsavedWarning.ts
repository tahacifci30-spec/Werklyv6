"use client";

import { useEffect } from "react";

/** Vraagt de browser om te waarschuwen als de gebruiker de pagina sluit of ververst terwijl er nog iets niet is opgeslagen. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
