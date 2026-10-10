import type { Metadata } from "next";
import Link from "next/link";
import { decideRoster } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { OffPeriod } from "@/components/roster/OffPeriod";
import { RosterCell } from "@/components/roster/RosterCell";
import { WeekNav } from "@/components/roster/WeekNav";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, SectionTitle, dateTimeNl } from "@/components/ui";
import { bookings, techLabel } from "@/lib/agenda";
import { requireSession } from "@/lib/auth";
import { parseDay, todayNl } from "@/lib/dates";
import { datesText, dayState, mondayOf, weekDays, weekOf } from "@/lib/roster";
import { getSettings, listAgendaItems, listLeads } from "@/lib/store";

export const metadata: Metadata = { title: "Rooster" };
export const dynamic = "force-dynamic";

/**
 * Het rooster van het hele team, los van de agenda: wie werkt deze week, wie is er vrij, en welke aanvragen wachten.
 * Afspraken plant u in de agenda; hier ziet en beslist u wanneer mensen werken.
 */
export default async function RosterPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const session = await requireSession("owner");
  const { w } = await searchParams;
  const today = todayNl();
  const monday = weekOf(w, today);
  const days = weekDays(monday);
  const [leads, items, settings] = await Promise.all([listLeads(session.company_id), listAgendaItems(session.company_id), getSettings(session.company_id)]);
  const all = bookings(leads);
  const open = settings.roster.filter((r) => r.status === "pending").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const decided = settings.roster.filter((r) => r.status !== "pending").sort((a, b) => (b.decided_at ?? "").localeCompare(a.decided_at ?? "")).slice(0, 6);

  return (
    <AppShell session={session} wide>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-md text-4xl">Rooster</h1>
          <p className="mt-1 text-muted">Wie werkt wanneer. Met het plusje of kruisje bij een dag roostert u iemand in of uit.</p>
        </div>
        <WeekNav base="/dashboard/rooster" monday={monday} thisMonday={mondayOf(today)} />
      </div>

      {open.length > 0 && (
        <section aria-labelledby="open-title" className="mt-5 rounded-2xl border border-signal/60 bg-signal/15 p-4 sm:p-5">
          <h2 id="open-title" className="text-base font-semibold">
            {open.length} {open.length === 1 ? "aanvraag wacht" : "aanvragen wachten"} op u
          </h2>
          <ul className="mt-3 space-y-3">
            {open.map((r) => {
              // Bij vrij vragen: staan er al afspraken op die dagen? Dan moet u die eerst overdragen of verzetten.
              const clash = r.kind === "off" ? all.filter((b) => b.appt.technician === r.who && r.dates.includes(b.appt.date) && !b.done).length : 0;
              return (
                <li key={r.id} className="rounded-xl bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {techLabel(r.who)} {r.kind === "off" ? `vraagt ${(r.reason ?? "vrij").toLowerCase()} aan` : "kan werken"}
                      </p>
                      <p className="mt-0.5">{datesText(r.dates)}</p>
                      {r.note && <p className="mt-1 text-sm text-muted">&ldquo;{r.note}&rdquo;</p>}
                      {clash > 0 && (
                        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          Let op: {r.who.split(" ")[0]} heeft op deze dagen {clash} {clash === 1 ? "afspraak" : "afspraken"}. Na goedkeuren draagt u die in de agenda over aan een collega.
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted">Aangevraagd op {dateTimeNl(r.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <form action={decideRoster.bind(null, r.id, "approved")}>
                        <SubmitButton pendingText="Bezig…">Goedkeuren</SubmitButton>
                      </form>
                      <form action={decideRoster.bind(null, r.id, "rejected")}>
                        <SubmitButton variant="secondary" pendingText="Bezig…">Afwijzen</SubmitButton>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="Weekrooster" className="mt-5 rounded-2xl border border-line bg-surface p-3 sm:p-5">
        <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] items-start gap-1 sm:grid-cols-[minmax(9rem,1.4fr)_repeat(7,minmax(0,1fr))] sm:gap-2">
          <span />
          {days.map((d) => (
            <div key={d} className={`rounded-lg py-1 text-center ${d === today ? "bg-brand text-white" : ""}`}>
              <p className={`text-[11px] font-medium uppercase ${d === today ? "text-white/85" : "text-muted"}`}>{parseDay(d).toLocaleDateString("nl-NL", { weekday: "short" })}</p>
              <p className="tabular text-sm font-semibold">{parseDay(d).getDate()}</p>
            </div>
          ))}

          {settings.team.map((m) => {
            const states = days.map((d) => dayState(m, items, settings.roster, m.name, d));
            const count = states.filter((s) => s.works).length;
            return (
              <div key={m.name} className="contents">
                <div className="min-w-0 py-1 pr-1">
                  <p className="truncate text-sm font-semibold">{m.name === "Eigenaar" ? "Ik zelf" : m.name.split(" ")[0]}</p>
                  <p className="truncate text-xs text-muted">
                    {count} {count === 1 ? "dag" : "dagen"}
                    {m.days.length === 0 ? ", wisselend" : ""}
                  </p>
                </div>
                {states.map((s) => {
                  const n = all.filter((b) => b.appt.technician === m.name && b.appt.date === s.date).length;
                  const label = s.off ? (s.off === "Ziek" ? "Ziek" : s.off === "Niet beschikbaar" ? "NB" : s.off) : s.works ? (n > 0 ? String(n) : "") : "";
                  const first = m.name === "Eigenaar" ? "uzelf" : m.name.split(" ")[0];
                  return (
                    <RosterCell
                      key={s.date}
                      who={m.name}
                      first={first}
                      date={s.date}
                      href={`/dashboard/agenda?m=${s.date.slice(0, 7)}&d=${s.date}`}
                      title={`${m.name}, ${parseDay(s.date).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}: ${s.off ?? (s.works ? `werkt, ${n} ${n === 1 ? "afspraak" : "afspraken"}` : "vrij")}${s.pending ? ", aanvraag wacht" : ""}`}
                      label={label}
                      works={s.works}
                      off={!!s.off}
                      pending={!!s.pending}
                      canToggle={s.date >= today}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-soft ring-1 ring-inset ring-brand/30" aria-hidden="true" /> Werkt (getal = afspraken)</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-background ring-1 ring-inset ring-line" aria-hidden="true" /> Vrij</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-100" aria-hidden="true" /> Verlof, ziek of niet beschikbaar (NB)</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-signal" aria-hidden="true" /> Aanvraag wacht</li>
        </ul>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Zelf iets wijzigen</SectionTitle>
          <ul className="space-y-3 text-sm">
            <li>
              <span className="font-semibold">Iemand voor één dag in- of uitroosteren</span>
              <span className="block text-muted">Het kruisje bij een dag haalt iemand er die dag uit, het plusje zet iemand erin. Eén klik is genoeg. Op een computer verschijnt het als u een vakje aanwijst.</span>
            </li>
            <li>
              <span className="font-semibold">Vakantie, verlof of ziek</span>
              <span className="mb-2 block text-muted">Voor meerdere dagen achter elkaar, met de reden erbij.</span>
              <OffPeriod today={today} team={settings.team.map((m) => ({ name: m.name, label: techLabel(m.name) }))} />
            </li>
            <li>
              <Link href="/dashboard/settings" className="font-semibold text-brand-strong hover:underline">Vaste werkdagen voor elke week</Link>
              <span className="block text-muted">Alleen als iemand voortaan andere vaste dagen werkt: bij Instellingen, onder Team en werkdagen.</span>
            </li>
          </ul>
        </Card>
        <Card>
          <SectionTitle>Laatst beoordeeld</SectionTitle>
          {decided.length === 0 ? (
            <p className="text-sm text-muted">Nog geen aanvragen beoordeeld. Monteurs vragen vrij aan via hun eigen rooster.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {decided.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <span className="min-w-0">
                    <span className="font-medium">{techLabel(r.who)}</span>, {r.kind === "off" ? (r.reason ?? "vrij").toLowerCase() : "kan werken"}: {datesText(r.dates)}
                  </span>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${r.status === "approved" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                    {r.status === "approved" ? "Goedgekeurd" : "Afgewezen"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
