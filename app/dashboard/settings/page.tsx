import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { CopyButton } from "@/components/CopyButton";
import { Flash } from "@/components/Flash";
import { FormEditor } from "@/components/settings/FormEditor";
import { CompanyForm, LegalForm, PricingForm, ProductsForm, TeamForm } from "@/components/settings/SettingsForms";
import { Card, SectionTitle } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { NOTICES } from "@/lib/notices";
import { formatRange, priceBounds } from "@/lib/pricing/engine";
import { PRICE_GROUPS, getPath, toDisplay } from "@/lib/pricing/fields";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "Instellingen" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await requireSession("owner");
  const { notice } = await searchParams;
  const s = await getSettings(session.company_id);

  const values: Record<string, number> = {};
  for (const g of PRICE_GROUPS) for (const f of g.fields) values[f.path] = toDisplay(f, getPath(s.pricing, f.path));

  const bounds = priceBounds(s.pricing);
  const examples: [string, string][] = [
    ["Goedkoopste antwoorden", formatRange(bounds.low)],
    ["Duurste antwoorden", formatRange(bounds.high)],
    ["Klant weet niets (alles 'Weet ik niet')", formatRange(bounds.unknown)],
  ];

  const embed = `<iframe src="/intake" title="Prijsindicatie aanvragen" style="width:100%;min-height:720px;border:0" loading="lazy"></iframe>`;

  return (
    <AppShell session={session}>
      <h1 className="display-md text-4xl">Instellingen</h1>
      <div className="mt-4">
        <Flash key={notice} message={notice ? NOTICES[notice] : undefined} />
      </div>

      <nav aria-label="Onderdelen van de instellingen" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {[
          ["bedrijf", "Bedrijf"],
          ["team", "Team en logins"],
          ["producten", "Producten"],
          ["factuur", "Factuurgegevens"],
          ["delen", "Formulier delen"],
          ["vragen", "Vragen en bedragen"],
          ["prijs", "Basisprijs"],
          ["voorbeeld", "Voorbeeld"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-muted transition-colors duration-100 hover:border-brand hover:text-foreground">
            {label}
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <Card id="bedrijf" className="scroll-mt-24">
          <SectionTitle>Bedrijf</SectionTitle>
          <CompanyForm values={{ company_name: s.company_name, phone: s.phone, email: s.email }} />
        </Card>

        <Card id="team" className="scroll-mt-24">
          <SectionTitle>Team en werkdagen</SectionTitle>
          <TeamForm team={s.team.map((m) => ({ name: m.name, days: m.days, email: m.email ?? "", phone: m.phone ?? "", hasLogin: !!m.pass }))} />
        </Card>

        <Card id="producten" className="scroll-mt-24">
          <SectionTitle>Vaste producten</SectionTitle>
          <ProductsForm products={s.products} />
        </Card>

        <Card id="factuur" className="scroll-mt-24">
          <SectionTitle>Gegevens voor de factuur</SectionTitle>
          <LegalForm values={s.legal} />
        </Card>

        <Card id="delen" className="scroll-mt-24">
          <SectionTitle>Klantformulier delen</SectionTitle>
          <p className="text-sm text-muted">
            Zet het formulier op uw website of deel de link. Aanvragen komen direct in uw overzicht.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton value="/intake" label="Link kopiëren" />
          </div>
          <label htmlFor="embed" className="mt-5 block text-sm font-medium">
            Code om het formulier in uw website te zetten
          </label>
          <textarea id="embed" readOnly rows={3} value={embed} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs" />
          <p className="mt-1 text-xs text-muted">Vervang het pad door het volledige adres van uw Werkly-omgeving.</p>
        </Card>

        <Card id="vragen" className="scroll-mt-24">
          <SectionTitle>Klantformulier: vragen en bedragen</SectionTitle>
          <FormEditor form={s.pricing.form} />
        </Card>

        <Card id="prijs" className="scroll-mt-24">
          <SectionTitle>Basisprijs en bandbreedte</SectionTitle>
          <p className="mb-5 text-sm text-muted">
            De prijsindicatie is de basisprijs plus de bedragen van de gekozen antwoorden hierboven. Bedragen zijn inclusief btw.
            Bestaande aanvragen behouden de prijs die de klant zag.
          </p>
          <PricingForm values={values} />
        </Card>

        <Card id="voorbeeld" className="scroll-mt-24">
          <SectionTitle>Wat uw klant te zien krijgt</SectionTitle>
          <ul className="divide-y divide-line text-sm">
            {examples.map(([label, range]) => (
              <li key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <span className="min-w-0 max-w-md text-muted">{label}</span>
                <strong className="tabular">{range}</strong>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
