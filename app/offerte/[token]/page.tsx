import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decideQuote } from "@/app/actions";
import { PrintButton } from "@/components/CopyButton";
import { AcceptForm } from "@/components/offer/AcceptForm";
import { AmountsTable } from "@/components/offer/AmountsTable";
import { durationLabel, installDays } from "@/lib/duration";
import { dateTimeNl } from "@/components/ui";
import { getLeadByToken, getSettings } from "@/lib/store";

export const metadata: Metadata = {
  title: "Uw offerte",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lead = await getLeadByToken(token);
  // Alleen zichtbaar nadat de offerte is verstuurd.
  if (!lead || !lead.quote?.sent_at) notFound();
  const company = await getSettings(lead.company_id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 print:py-0">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8 print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand">{company.company_name}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Offerte installatie</h1>
          </div>
          <p className="text-right text-sm text-muted">
            Datum {dateTimeNl(lead.quote.sent_at ?? lead.quote.generated_at).split(",")[0]}
            <br />
            Referentie {lead.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

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
            <p>{company.phone}</p>
            <p>{company.email}</p>
          </div>
        </div>

        <AmountsTable items={lead.quote.items} business={!!lead.customer.company} caption="Onderdelen van de offerte" />
        <p className="mt-1 text-xs text-muted">Deze offerte is 30 dagen geldig.</p>
        <p className="mt-3 text-sm">Het plaatsen duurt naar verwachting <strong>{durationLabel(installDays(lead))}</strong>.</p>

        <div className="mt-8 print:hidden">
          {lead.status === "quote_sent" && (
            <AcceptForm
              accept={decideQuote.bind(null, token, "accepted")}
              reject={decideQuote.bind(null, token, "rejected")}
              companyName={company.company_name}
            />
          )}
          {lead.status !== "quote_sent" && lead.status !== "rejected" && (
            <p role="status" className="rounded-xl bg-emerald-50 p-4 font-medium text-emerald-800">
              Bedankt, u bent akkoord. {company.company_name} neemt contact met u op om de installatie in te plannen.
            </p>
          )}
          {lead.status === "rejected" && (
            <p role="status" className="rounded-xl bg-slate-100 p-4 text-slate-800">
              U heeft aangegeven niet akkoord te zijn. Heeft u vragen of wilt u iets aanpassen? Bel{" "}
              {company.company_name} op {company.phone}.
            </p>
          )}
        </div>

        <div className="mt-6 print:hidden">
          <PrintButton />
        </div>
      </div>
    </main>
  );
}
