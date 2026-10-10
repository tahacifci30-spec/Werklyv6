import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { btn, dayNl } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatEur, quoteTotal } from "@/lib/pricing/engine";
import { listLeads } from "@/lib/store";

export const metadata: Metadata = { title: "Nog te factureren" };
export const dynamic = "force-dynamic";

/** Klussen die klaar zijn maar nog geen verstuurde factuur hebben; het langst liggende staat bovenaan. */
export default async function ToInvoicePage() {
  const session = await requireSession("owner");
  const leads = await listLeads(session.company_id);
  const rows = leads
    .filter((l) => l.status === "install_done" && l.invoice)
    .map((l) => ({ lead: l, total: quoteTotal(l.invoice!.items), done: l.install?.completed_at ?? l.invoice!.created_at }))
    .sort((a, b) => a.done.localeCompare(b.done));
  const sum = rows.reduce((s, r) => s + r.total, 0);

  return (
    <AppShell session={session} wide>
      <Link href="/dashboard/revenue" className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-foreground">
        ← Omzet
      </Link>
      <h1 className="display-md text-4xl">Nog te factureren</h1>
      <p className="mt-1 text-muted">
        {rows.length === 0
          ? "Alle uitgevoerde klussen zijn gefactureerd."
          : `${rows.length} ${rows.length === 1 ? "klus is" : "klussen zijn"} klaar, samen ${formatEur(sum)}. Controleer de conceptfactuur en verstuur hem.`}
      </p>

      <ul className="mt-5 space-y-3">
        {rows.map(({ lead: l, total, done }) => {
          const extras = l.install?.extras?.length ?? 0;
          return (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="min-w-0">
                <p className="break-words text-lg font-semibold">{l.customer.name}</p>
                <p className="text-sm text-muted">
                  {l.customer.city}, installatie klaar op {dayNl(done.slice(0, 10))}
                  {extras > 0 && `, met ${extras} ${extras === 1 ? "regel" : "regels"} meerwerk`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="tabular text-xl font-semibold">{formatEur(total)}</p>
                <Link href={`/dashboard/${l.id}?tab=factuur`} className={btn.primary}>
                  Factuur controleren
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
