import type { Metadata } from "next";
import { IntakeFlow } from "@/components/intake/IntakeFlow";
import { Logo } from "@/components/ui";
import { DEFAULT_COMPANY, getSettings } from "@/lib/store";

export const metadata: Metadata = {
  title: "Prijsindicatie aanvragen",
  description: "Beantwoord 5 korte vragen en zie direct een prijsindicatie.",
};
export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const s = await getSettings(DEFAULT_COMPANY);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Naar hoofdinhoud
      </a>
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:py-16">
        <IntakeFlow companyName={s.company_name} phone={s.phone} rules={s.pricing} />
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted">
        Aangeboden via <span className="inline-block align-middle"><Logo href="/" /></span> ·{" "}
        <a href="/privacy" className="underline">Privacy</a>
      </footer>
    </>
  );
}
