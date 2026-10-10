import Link from "next/link";
import { Logo, btn } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 text-center">
      <div className="mx-auto"><Logo /></div>
      <p className="mt-10 text-sm font-semibold text-brand">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Deze pagina bestaat niet</h1>
      <p className="mt-2 text-muted">De link is verlopen of het adres klopt niet.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className={btn.primary}>Naar de startpagina</Link>
        <Link href="/login" className={btn.secondary}>Inloggen</Link>
      </div>
    </main>
  );
}
