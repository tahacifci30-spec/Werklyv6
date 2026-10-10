import type { Metadata } from "next";
import Link from "next/link";
import { withdrawRoster } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { RosterRequestForm } from "@/components/roster/RosterRequestForm";
import { WeekNav } from "@/components/roster/WeekNav";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionTitle } from "@/components/ui";
import { KIND_LABEL, bookings, itemDays } from "@/lib/agenda";
import { requireSession } from "@/lib/auth";
import { parseDay, todayNl } from "@/lib/dates";
import { datesText, dayState, mondayOf, weekDays, weekOf } from "@/lib/roster";
import { getSettings, listAgendaItems, listLeads } from "@/lib/store";

export const metadata: Metadata = { title: "Mijn rooster" };
export const dynamic = "force-dynamic";

const STATUS = {
  pending: ["In behandeling", "bg-signal/25 text-petrol"],
  approved: ["Goedgekeurd", "bg-emerald-50 text-emerald-800"],
  rejected: ["Afgewezen", "bg-red-50 text-red-800"],
} as const;

/**
 * Het rooster van de monteur, los van de agenda: per week zien wanneer u werkt, en vrij vragen of dagen opgeven.
 * Afspraken zelf staan in de agenda; hier gaat het alleen om wanneer u werkt.
 */
export default async function TechnicianRosterPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const session = await requireSession("technician");
  const { w } = await searchParams;
  const today = todayNl();
  const monday = weekOf(w, today);
  const [leads, items, settings] = await Promise.all([listLeads(session.company_id), listAgendaItems(session.company_id), getSettings(session.company_id)]);

  const me = settings.team.find((m) => m.name === session.name);
  const mine = settings.roster.filter((r) => r.who === session.name);
  const days = weekDays(monday).map((d) => dayState(me, items, mine, session.name, d));
  const visits = bookings(leads).filter((b) => b.appt.technician === session.name);
  const workCount = days.filter((d) => d.works).length;
  const flex = !!me && me.days.length === 0;

  const pendingDates = (kind: "off" | "work") => mine.filter((r) => r.status === "pending" && r.kind === kind).flatMap((r) => r.dates);
  const offDates = items.filter((i) => i.kind === "off" && i.who === session.name).flatMap(itemDays);
  const history = [...mine].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12);

  return (
    <AppShell session={session}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-md text-4xl">Mijn rooster</h1>
          <p className="mt-1 text-muted">
            {workCount === 0 ? "U werkt deze week niet." : `U werkt deze week ${workCount} ${workCount === 1 ? "dag" : "dagen"}.`}
          </p>
        </div>
        <WeekNav base="/technician/rooster" monday={monday} thisMonday={mondayOf(today)} />
      </div>

      <ul className="mt-5 space-y-2">
        {days.map((d) => {
          const todays = visits.filter((b) => b.appt.date === d.date).sort((a, b) => a.appt.time.localeCompare(b.appt.time));
          const isToday = d.date === today;
          return (
            <li
              key={d.date}
              className={`flex items-center gap-4 rounded-2xl border p-4 ${d.works ? "border-line bg-surface" : "border-transparent bg-background"} ${isToday ? "ring-2 ring-brand" : ""}`}
            >
              <div className="w-14 shrink-0 text-center">
                <p className="text-xs font-medium uppercase text-muted">{parseDay(d.date).toLocaleDateString("nl-NL", { weekday: "short" })}</p>
                <p className="tabular text-2xl font-semibold leading-tight">{parseDay(d.date).getDate()}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`font-semibold ${d.off ? "text-red-800" : d.works ? "" : "text-muted"}`}>
                    {d.off ? (d.off === "Niet beschikbaar" ? "Niet beschikbaar" : d.off) : d.works ? "Werkdag" : "Vrij"}
                  </span>
                  {d.pending && (
                    <span className="rounded-md bg-signal/25 px-1.5 py-0.5 text-xs font-semibold text-petrol">
                      {d.pending === "off" ? "Vrij aangevraagd" : "Opgegeven om te werken"}
                    </span>
                  )}
                </p>
                {todays.length > 0 ? (
                  <Link href={`/technician/agenda?m=${d.date.slice(0, 7)}&d=${d.date}`} className="mt-0.5 block text-sm text-brand-strong hover:underline">
                    {todays.length} {todays.length === 1 ? "afspraak" : "afspraken"}: {todays.map((b) => `${b.appt.time} ${KIND_LABEL[b.kind].toLowerCase()} in ${b.lead.customer.city}`).join(", ")}
                  </Link>
                ) : (
                  d.works && <p className="mt-0.5 text-sm text-muted">Nog geen afspraken</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4">
        <Card>
          <SectionTitle>Iets doorgeven</SectionTitle>
          <p className="-mt-1 mb-4 text-sm text-muted">
            {flex
              ? "U werkt op wisselende dagen. Geef hier op wanneer u kunt werken, ook weken of maanden vooruit. De eigenaar keurt het goed."
              : "Vraag vrij aan of geef een extra dag op waarop u kunt werken. De eigenaar keurt het goed; tot die tijd blijft uw rooster zoals het is."}
          </p>
          <RosterRequestForm
            today={today}
            fixed={me?.days ?? []}
            extra={me?.extra ?? []}
            off={offDates}
            pendingOff={pendingDates("off")}
            pendingWork={pendingDates("work")}
            flex={flex}
          />
        </Card>

        <Card>
          <SectionTitle>Mijn aanvragen</SectionTitle>
          {history.length === 0 ? (
            <p className="text-sm text-muted">U heeft nog niets aangevraagd.</p>
          ) : (
            <ul className="divide-y divide-line">
              {history.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.kind === "off" ? r.reason : "Kan werken"}: <span className="font-normal">{datesText(r.dates)}</span>
                    </p>
                    {r.note && <p className="text-sm text-muted">{r.note}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
                    {r.status === "pending" && (
                      <form action={withdrawRoster.bind(null, r.id)}>
                        <SubmitButton variant="secondary" pendingText="Bezig…" className="!min-h-10 !px-3">
                          Intrekken
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
