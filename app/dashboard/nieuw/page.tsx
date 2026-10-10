import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NewLeadForm } from "@/components/lead/NewLeadForm";
import { Card } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "Aanvraag toevoegen" };
export const dynamic = "force-dynamic";

/** Voor een klant die belt of langskomt: de eigenaar zet de aanvraag er zelf in. */
export default async function NewLeadPage() {
  const session = await requireSession("owner");
  const settings = await getSettings(session.company_id);
  return (
    <AppShell session={session}>
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-foreground">
        ← Alle aanvragen
      </Link>
      <h1 className="display-md mt-1 text-4xl">Aanvraag toevoegen</h1>
      <p className="mt-1 text-muted">Voor een klant die belt. Naam en telefoonnummer zijn genoeg om te beginnen.</p>
      <Card className="mt-5">
        <NewLeadForm form={settings.pricing.form} />
      </Card>
    </AppShell>
  );
}
