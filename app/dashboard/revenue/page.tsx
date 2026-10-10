import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RevenueChart } from "@/components/RevenueChart";
import { Card, SectionTitle, dateNl } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { dayShort } from "@/lib/dates";
import { computeMetrics } from "@/lib/metrics";
import { formatEur } from "@/lib/pricing/engine";
import { PERIODS, buckets, outstanding, paidInvoices, toInvoice, type Period } from "@/lib/revenue";
import { listLeads } from "@/lib/store";

export const metadata: Metadata = { title: "Omzet" };
export const dynamic = "force-dynamic";

// Percentages en gemiddelden zeggen pas iets bij genoeg aanvragen.
const MIN_FOR_RATES = 10;

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const session = await requireSession("owner");
  const sp = await searchParams;
  const period: Period = PERIODS.some((p) => p.id === sp.p) ? (sp.p as Period) : "month";
  const meta = PERIODS.find((p) => p.id === period)!;

  const leads = await listLeads(session.company_id);
  const paid = paidInvoices(leads);
  const series = buckets(paid, period);
  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const max = Math.max(...series.map((b) => b.total), 1);
  const change = previous && previous.total > 0 ? Math.round(((current.total - previous.total) / previous.total) * 100) : null;
  const m = computeMetrics(leads);
  const enough = leads.length >= MIN_FOR_RATES;
  const pct = (v: number | null) => (v === null || !enough ? "–" : `${Math.round(v * 100)}%`);
  const unpaidCount = leads.filter((l) => l.status === "invoice_sent").length;

  return (
    <AppShell session={session} wide>
      <h1 className="display-md text-4xl">Omzet</h1>
      <p className="mt-1 text-muted">Omzet telt mee zodra een factuur is betaald.</p>

      <nav aria-label="Periode" className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 sm:flex sm:w-fit">
        {PERIODS.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/revenue?p=${p.id}`}
            aria-current={period === p.id ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium ${
              period === p.id ? "bg-white text-brand-strong shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      <section aria-label="Samenvatting" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 rounded-2xl bg-slate-900 p-5 text-white lg:col-span-1">
          <p className="text-sm text-slate-300">{meta.current}</p>
          <p className="tabular mt-1 text-3xl font-semibold">{formatEur(current.total)}</p>
          <p className="mt-1 text-sm text-slate-300">
            {change === null ? "Geen vergelijking mogelijk" : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% t.o.v. vorige periode`}
          </p>
        </div>
        <Stat label="Klussen afgerond" value={String(current.count)} hint={meta.current.toLowerCase()} />
        <Stat
          label="Nog te ontvangen"
          value={formatEur(outstanding(leads))}
          hint={unpaidCount > 0 ? `${unpaidCount} ${unpaidCount === 1 ? "factuur" : "facturen"} open. Bekijk wie nog moet betalen` : "Niets openstaand"}
          href={unpaidCount > 0 ? "/dashboard/revenue/openstaand" : undefined}
        />
        <Stat label="Nog te factureren" value={formatEur(toInvoice(leads))} hint="Installatie klaar. Bekijk welke klussen" href="/dashboard/revenue/te-factureren" />
      </section>

      <Card className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionTitle>Omzet {meta.unit}</SectionTitle>
          <p className="text-xs text-muted">Beweeg over een staaf voor de details</p>
        </div>
        <RevenueChart series={series} max={max} />

        <details className="mt-4 text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-medium text-brand">Cijfers als tabel</summary>
          <table className="mt-2 w-full">
            <caption className="sr-only">Omzet {meta.unit}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th scope="col" className="py-2 font-medium">Periode</th>
                <th scope="col" className="py-2 text-right font-medium">Klussen</th>
                <th scope="col" className="py-2 text-right font-medium">Omzet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...series].reverse().map((b) => (
                <tr key={b.key}>
                  <th scope="row" className="py-2 text-left font-normal first-letter:uppercase">{b.long}</th>
                  <td className="tabular py-2 text-right">{b.count}</td>
                  <td className="tabular py-2 text-right font-medium">{formatEur(b.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle>Laatst betaalde facturen</SectionTitle>
          {paid.length === 0 ? (
            <p className="text-sm text-muted">Nog geen betaalde facturen. Zodra u een betaling markeert als ontvangen, verschijnt die hier.</p>
          ) : (
            <ul className="divide-y divide-line">
              {paid.slice(0, 8).map((p) => (
                <li key={p.lead.id}>
                  <Link href={`/dashboard/${p.lead.id}?tab=factuur`} className="flex items-center justify-between gap-3 py-3 hover:text-brand-strong">
                    <span className="min-w-0 text-sm">
                      <span className="block break-words font-medium">{p.lead.customer.name}</span>
                      <span className="block text-muted">
                        {dayShort(p.day)}
                        {p.lead.invoice?.number && ` · factuur ${p.lead.invoice.number}`}
                      </span>
                    </span>
                    <span className="tabular shrink-0 font-semibold">{formatEur(p.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Kerncijfers aanvragen</SectionTitle>
          <dl className="space-y-3 text-sm">
            <Row k="Nieuw in de afgelopen 7 dagen" v={String(m.newThisWeek)} />
            <Row k="Waarde open aanvragen" v={formatEur(m.pipelineValue)} />
            <Row k="Volledig ingevuld door de klant" v={pct(m.completeRate)} />
            <Row
              k="Gemiddeld van aanvraag tot offerte"
              v={m.daysToQuote === null || !enough ? "–" : `${m.daysToQuote.toFixed(1).replace(".", ",")} dagen`}
            />
            <Row k="Offertes akkoord" v={pct(m.winRate)} />
          </dl>
          {!enough && (
            <p className="mt-4 text-xs text-muted">
              Percentages en gemiddelden verschijnen vanaf {MIN_FOR_RATES} aanvragen. Nu: {leads.length}.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">Laatste betaling: {paid[0] ? dateNl(paid[0].lead.invoice!.paid_at!) : "–"}</p>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className={`mt-0.5 text-xs ${href ? "font-medium text-brand-strong" : "text-muted"}`}>{hint}{href && " →"}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl border border-line bg-surface p-4 transition-[background-color,border-color,color,transform] duration-100 ease-out active:scale-[0.98] hover:border-brand hover:bg-brand-soft">
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl border border-line bg-surface p-4">{body}</div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="tabular shrink-0 font-semibold">{v}</dd>
    </div>
  );
}
