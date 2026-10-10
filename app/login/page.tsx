import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/ui";
import { AUTH_CONFIGURED, DEMO_HINT, getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "owner" ? "/dashboard" : "/technician");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Inloggen</h1>
      <p className="mt-1 text-muted">Log in op uw Werkly-omgeving.</p>
      {!AUTH_CONFIGURED && (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Inloggen staat uit: stel AUTH_SECRET en DEMO_PASSWORD in als omgevingsvariabelen en publiceer opnieuw.
        </p>
      )}
      <LoginForm />
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-muted">
          <p className="font-medium text-foreground">Demo-accounts (alleen lokaal)</p>
          <p>Eigenaar: {DEMO_HINT.users[0]}</p>
          <p>Monteur: {DEMO_HINT.users[1]}</p>
          <p>Wachtwoord: {DEMO_HINT.password}</p>
        </div>
      )}
    </main>
  );
}
