import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { completeInstall, completeVisit, declineAppointment } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { ConfirmForm } from "@/components/ConfirmForm";
import { InstallForm } from "@/components/technician/InstallForm";
import { TechForm } from "@/components/technician/TechForm";
import { Card, SectionTitle, dayNl } from "@/components/ui";
import { KIND_LABEL, type Kind } from "@/lib/agenda";
import { requireSession } from "@/lib/auth";
import { TECH_OPTIONS, openChecks, requestFacts } from "@/lib/dossier";
import { formatEur } from "@/lib/pricing/engine";
import { getLead, getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "Afspraak" };
export const dynamic = "force-dynamic";

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const lead = await getLead(id, session.company_id);
  if (!lead) notFound();

  const kind: Kind | null =
    lead.status === "visit_planned" ? "visit" : lead.status === "install_planned" ? "install" : null;
  const appt = kind === "install" ? lead.install_appointment : lead.appointment;
  // Alleen de monteur die op de afspraak staat ziet deze pagina.
  if (!appt || appt.technician !== session.name) notFound();

  const open = !!kind && !appt.declined_at;
  const facts = requestFacts(lead, (await getSettings(session.company_id)).pricing.form);
  const todo = openChecks(lead);
  const address = `${lead.customer.street}, ${lead.customer.postcode} ${lead.customer.city}`;
  const tel = lead.customer.phone.replace(/\s/g, "");
  const defaultUnits = lead.quote?.items.map((i) => /\((\d+) units?\)/.exec(i.label)?.[1]).find(Boolean);

  return (
    <AppShell session={session}>
      <Link href="/technician" className="inline-flex min-h-11 items-center text-sm font-medium text-muted hover:text-foreground">
        ← Mijn werk
      </Link>
      <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight">{lead.customer.name}</h1>
      <p className="text-muted">
        {kind ? KIND_LABEL[kind] : "Afspraak"} · {dayNl(appt.date)} om {appt.time}
      </p>
      <p className="mt-1 break-words font-medium">{address}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white"
        >
          Navigeren
        </a>
        <a href={`tel:${tel}`} className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold">
          Bel {lead.customer.phone}
        </a>
      </div>

      {!open && (
        <p className="mt-6 rounded-lg bg-slate-100 p-4 text-slate-800">
          Deze afspraak staat niet meer open voor u. De eigenaar plant een nieuw moment in of de afspraak is al afgerond.
        </p>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4">
        <Card>
          <SectionTitle>Aanvraag</SectionTitle>
          <ul className="space-y-2 text-sm">
            {facts.map((f) => (
              <li key={f.label} className="flex justify-between gap-3">
                <span className="text-muted">{f.label}</span>
                <span className={`min-w-0 break-words text-right font-medium ${f.source === "unknown" ? "text-amber-900" : ""}`}>{f.value}</span>
              </li>
            ))}
          </ul>
        </Card>

        {lead.customer_photos.length > 0 && (
          <Card>
            <SectionTitle>Foto&apos;s van de klant</SectionTitle>
            <ul className="grid grid-cols-3 gap-2">
              {lead.customer_photos.map((p, i) => (
                <li key={p}>
                  <a href={`/api/photo/${p}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/photo/${p}`} alt={`Foto ${i + 1} van de klant`} width={400} height={400} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {open && kind === "visit" && (
          <>
            <Card>
              <SectionTitle>Wat moet gecontroleerd worden</SectionTitle>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {todo.map((k) => (
                  <li key={k}>{TECH_OPTIONS[k].label}</li>
                ))}
              </ul>
            </Card>
            <Card>
              <SectionTitle>Checklist bezoek</SectionTitle>
              <TechForm action={completeVisit.bind(null, lead.id)} check={lead.check} />
            </Card>
          </>
        )}

        {open && kind === "install" && lead.quote && (
          <>
            <Card>
              <SectionTitle>Afgesproken in de offerte</SectionTitle>
              <ul className="divide-y divide-line text-sm">
                {lead.quote.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0 break-words">{i.label}</span>
                    <span className="tabular shrink-0">{formatEur(i.amount)}</span>
                  </li>
                ))}
              </ul>
              {lead.check.notes && <p className="mt-3 whitespace-pre-line break-words rounded-lg bg-slate-50 p-3 text-sm">{lead.check.notes}</p>}
            </Card>
            <Card>
              <SectionTitle>Installatie afronden</SectionTitle>
              <InstallForm action={completeInstall.bind(null, lead.id)} defaultUnits={Number(defaultUnits ?? 1)} />
            </Card>
          </>
        )}

        {open && (
          <Card>
            <SectionTitle>Lukt het niet?</SectionTitle>
            <p className="mb-3 text-sm text-muted">De eigenaar krijgt direct een melding en plant een ander moment of een andere monteur in.</p>
            <ConfirmForm
              action={declineAppointment.bind(null, lead.id)}
              label="Ik kan niet op dit moment"
              question="Weet u zeker dat u deze afspraak niet kunt doen?"
              note="De afspraak verdwijnt uit uw overzicht."
              confirmLabel="Ja, ik kan niet"
              variant="danger"
            />
          </Card>
        )}
      </div>
    </AppShell>
  );
}
