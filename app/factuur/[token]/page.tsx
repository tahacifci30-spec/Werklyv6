import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/CopyButton";
import { AmountsTable } from "@/components/offer/AmountsTable";
import { dayNl } from "@/components/ui";
import { formatEur, quoteTotal } from "@/lib/pricing/engine";
import { getLeadByToken, getSettings } from "@/lib/store";

export const metadata: Metadata = {
  title: "Factuur",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lead = await getLeadByToken(token);
  // Alleen zichtbaar nadat de factuur is verstuurd.
  if (!lead || !lead.invoice?.sent_at) notFound();
  const inv = lead.invoice;
  const sentAt = lead.invoice.sent_at;
  const company = await getSettings(lead.company_id);
  const total = quoteTotal(inv.items);
  const paid = !!inv.paid_at;
  const l = company.legal;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 print:max-w-none print:py-0">
      <article className="relative rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {paid && (
          <p className="absolute right-6 top-6 -rotate-6 rounded-md border-2 border-emerald-700 px-3 py-1 text-lg font-bold uppercase tracking-wide text-emerald-700 sm:right-8 sm:top-8" aria-label="Betaald">
            Betaald
          </p>
        )}
        <header>
          <p className="text-sm font-medium text-brand">{company.company_name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Factuur {inv.number}</h1>
        </header>

        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold">Aan</p>
            {lead.customer.company && <p className="font-medium">{lead.customer.company}</p>}
            <p>{lead.customer.name}</p>
            <p>{lead.customer.street}</p>
            <p>
              {lead.customer.postcode} {lead.customer.city}
            </p>
          </div>
          <div>
            <p className="font-semibold">Van</p>
            <p>{company.company_name}</p>
            {l.address && <p>{l.address}</p>}
            <p>{company.phone}</p>
            <p>{company.email}</p>
            {l.kvk && <p>KvK {l.kvk}</p>}
            {l.btw && <p>Btw {l.btw}</p>}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Factuurdatum</dt>
            <dd className="font-medium">{dayNl(sentAt.slice(0, 10))}</dd>
          </div>
          {inv.due_date && (
            <div>
              <dt className="text-muted">Te betalen vóór</dt>
              <dd className="font-medium">{dayNl(inv.due_date)}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Factuurnummer</dt>
            <dd className="font-medium">{inv.number}</dd>
          </div>
        </dl>

        <AmountsTable items={inv.items} business={!!lead.customer.company} caption="Onderdelen van de factuur" />

        {!paid && (
          <div className="mt-7 rounded-xl bg-slate-50 p-4 text-sm print:border print:border-line">
            <p className="font-semibold">Betalen</p>
            <p className="mt-1">
              Maak {formatEur(total)} over
              {inv.due_date && <> vóór {dayNl(inv.due_date)}</>}
              {l.iban ? (
                <>
                  {" "}
                  naar <strong>{l.iban}</strong> t.n.v. {company.company_name}
                </>
              ) : (
                "."
              )}
              {l.iban && <>, onder vermelding van factuurnummer <strong>{inv.number}</strong>.</>}
            </p>
            {inv.pay_url && (
              <a href={inv.pay_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 items-center rounded-lg bg-brand px-6 text-base font-semibold text-white transition-transform duration-100 hover:bg-brand-strong active:scale-[0.97] print:hidden">
                Online betalen ↗
              </a>
            )}
          </div>
        )}

        <div className="mt-6 print:hidden">
          <PrintButton label="Opslaan als PDF of afdrukken" />
        </div>
      </article>
    </main>
  );
}
