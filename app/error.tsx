"use client";

import { useEffect } from "react";
import { btn } from "@/components/ui";

// In deze Next-versie heet de herstelfunctie `retry` (zie node_modules/next/dist/docs error.md).
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 text-center">
      <h1 className="display-md text-4xl">Er ging iets mis</h1>
      <p className="mt-2 text-muted">
        Uw gegevens zijn niet verloren gegaan. Probeer het opnieuw; blijft het misgaan, ververs dan de pagina.
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted">Foutcode: {error.digest}</p>}
      <div className="mt-6">
        <button type="button" onClick={() => retry()} className={btn.primary}>Opnieuw proberen</button>
      </div>
    </main>
  );
}
