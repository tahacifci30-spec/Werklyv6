import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { logReminder, markPaid } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { ConfirmForm } from "@/components/ConfirmForm";
import { CopyButton } from "@/components/CopyButton";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { btn, dateNl, dayNl } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { daysBetween, todayNl } from "@/lib/dates";
import { NOTICES } from "@/lib/notices";
import { formatEur, quoteTotal } from "@/lib/pricing/engine";
import { getSettings, listLeads } from "@/lib/store";

export const metadata: Metadata = { title: "Nog te ontvangen" };
export const dynamic = "force-dynamic";

export default async function OutstandingPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const session = await requireSession("owner");
  const { notice } = await searchParams;
  const [leads, company] = await Promise.all([listLeads(session.company_id), getSettings(session.company_id)]);
  const today = todayNl();

  const rows = leads
    .filter((l) => l.status === "invoice_sent" && l.invoice)
    .map((l) => ({ lead: l, inv: l.invoice!, total: quoteTotal(l.invoice!.items) }))
    .sort((a, b) => (a.inv.due_date ?? "").localeCompare(b.inv.due_date ?? ""));
  const totalOpen = rows.reduce((s, r) => s + r.total, 0);

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"}`;

  return (
    <AppShell session={session} wide>
      <Link href="/dashboard/revenue" className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-foreground">
        ← Omzet
      </Link>
      <h1 className="display-md text-4xl">Nog te ontvangen</h1>
      <p className="mt-1 text-muted">
        {rows.length === 0 ? "Alle verstuurde facturen zijn betaald." : `${rows.length} ${rows.length === 1 ? "factuur" : "facturen"} open, samen ${formatEur(totalOpen)}.`}
      </p>

      <div className="mt-4">
        <Flash key={notice} message={notice ? NOTICES[notice] : undefined} />
      </div>

      <ul className="mt-2 space-y-3">
        {rows.map(({ lead: l, inv, total }) => {
          const late = inv.due_date ? daysBetween(inv.due_date, today) : 0;
          const first = l.customer.name.split(" ")[0];
          const link = `${origin}/factuur/${l.token}`;
          const text = `Hallo ${first}, een vriendelijke herinnering: factuur ${inv.number} van ${formatEur(total)} staat nog open${
            inv.due_date ? ` (te betalen vóór ${dayNl(inv.due_date)})` : ""
          }. U vindt de factuur hier: ${link}. Heeft u al betaald? Dan kunt u dit bericht negeren. Groet, ${company.company_name}`;
          let digits = l.customer.phone.replace(/\D/g, "");
          if (digits.startsWith("0")) digits = `31${digits.slice(1)}`;
          const count = inv.reminders?.length ?? 0;

          return (
            <li key={l.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/dashboard/${l.id}?tab=factuur`} className="break-words text-lg font-semibold hover:text-brand-strong">
                    {l.customer.name}
                  </Link>
                  <p className="text-sm text-muted">
                    Factuur {inv.number} · verstuurd {inv.sent_at ? dateNl(inv.sent_at) : "–"}
                    {inv.due_date && ` · te betalen vóór ${dayNl(inv.due_date)}`}
                  </p>
                  {late > 0 ? (
                    <p className="mt-1 text-sm font-medium text-red-700">{late} {late === 1 ? "dag" : "dagen"} te laat</p>
                  ) : (
                    <p className="mt-1 text-sm text-muted">Nog binnen de betaaltermijn</p>
                  )}
                  {count > 0 && <p className="text-xs text-muted">{count === 1 ? "1 herinnering verstuurd" : `${count} herinneringen verstuurd`}, laatste {dateNl(inv.reminders![count - 1])}</p>}
                </div>
                <p className="tabular text-xl font-semibold">{formatEur(total)}</p>
              </div>

              <details className="group mt-4 border-t border-line pt-3">
                <summary className={`${btn.secondary} w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                  Herinnering sturen
                </summary>
                <div className="mt-4 space-y-4 text-sm">
                  <p className="rounded-lg bg-slate-50 p-3 text-slate-700">{text}</p>
                  <div className="flex flex-wrap gap-2">
                    <a className={btn.primary} href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
                      WhatsApp ↗
                    </a>
                    <a className={btn.secondary} href={`mailto:${l.customer.email}?subject=${encodeURIComponent(`Herinnering factuur ${inv.number}`)}&body=${encodeURIComponent(text)}`}>
                      E-mail
                    </a>
                    <CopyButton value={link} label="Factuurlink kopiëren" />
                    <a className={btn.secondary} href={`tel:${l.customer.phone.replace(/\s/g, "")}`}>
                      Bellen
                    </a>
                  </div>
                  <form action={logReminder.bind(null, l.id)}>
                    <p className="mb-2 text-muted">Heeft u de herinnering verstuurd? Leg het dan vast, zodat u later ziet wanneer.</p>
                    <SubmitButton variant="secondary" pendingText="Vastleggen…">
                      Ik heb de herinnering verstuurd
                    </SubmitButton>
                  </form>
                </div>
              </details>

              <div className="mt-3">
                <ConfirmForm
                  action={markPaid.bind(null, l.id)}
                  label="Betaling ontvangen"
                  question={`Is de betaling van ${formatEur(total)} ontvangen?`}
                  note="De aanvraag wordt afgerond en telt mee in de omzet."
                  confirmLabel="Ja, betaald"
                  variant="secondary"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
