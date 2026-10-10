import Link from "next/link";
import { bookings, blocks, freeSlots, itemDays, lengthOf, overlaps, toMin, KIND_LABEL, OWNER, offOn, teamNames, techLabel, weekdayIndex, WEEKDAY_NAMES, worksOn } from "@/lib/agenda";
import { PART_LABEL, addDays, dayShort, monthLong, parseDay, todayNl } from "@/lib/dates";
import { getSettings, listAgendaItems, listLeads } from "@/lib/store";
import type { Session } from "@/lib/types";
import { AgendaCalendar, type DayData } from "./AgendaCalendar";

function shiftMonth(m: string, by: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + by, 1, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Agenda voor eigenaar en monteur. Alles wordt hier ingepland: bezoeken, installaties en overige afspraken.
 * De monteur ziet zijn eigen afspraken en de overige afspraken van het team, en kan zelf overige afspraken toevoegen.
 * Vrij, verlof en beschikbare dagen vraagt de monteur aan op zijn eigen roosterpagina; de eigenaar keurt goed.
 */
export async function AgendaView({ session, base, m, d }: { session: Session; base: string; m?: string; d?: string }) {
  const owner = session.role === "owner";
  const today = todayNl();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(m ?? "") ? m! : today.slice(0, 7);

  const [leads, allItems, settings] = await Promise.all([listLeads(session.company_id), listAgendaItems(session.company_id), getSettings(session.company_id)]);
  const roster = settings.team;
  const names = teamNames(roster);
  const bks = bookings(leads).filter((b) => owner || b.appt.technician === session.name);
  // Overige afspraken zijn voor het hele team zichtbaar; niet-beschikbaar alleen voor de eigenaar.
  const items = allItems.filter((i) => (owner ? true : i.kind === "item"));
  const bl = blocks(leads, allItems, roster);

  const first = `${month}-01`;
  const offset = (parseDay(first).getDay() + 6) % 7;
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => addDays(first, i - offset));

  const days: Record<string, DayData> = {};
  for (const day of cells) {
    days[day] = {
      date: day,
      bookings: bks
        .filter((b) => b.appt.date === day)
        .sort((a, b) => a.appt.time.localeCompare(b.appt.time))
        .map((b) => {
          const needsCover = owner && !b.done && !!offOn(allItems, b.appt.technician, day);
          return {
          key: b.lead.id + b.kind + (b.part?.n ?? ""),
          leadId: b.lead.id,
          techRaw: b.appt.technician,
          needsCover,
          // Alleen de eigenaar annuleert, en alleen een afspraak die nog moet komen of nog niet is afgerond.
          canCancel: owner && !b.done && b.lead.status.endsWith("_planned") && (!b.part || b.part.n === 1),
          alternatives: needsCover
            ? names
                .filter((t) => t !== b.appt.technician && worksOn(roster, t, day) && !offOn(allItems, t, day) && !overlaps(bl, t, day, toMin(b.appt.time), lengthOf(b.kind), b.lead.id))
                .map((t) => ({ name: t, label: techLabel(t) }))
            : [],
          kind: b.kind,
          label: b.part ? `${KIND_LABEL[b.kind]}, dag ${b.part.n} van ${b.part.total}` : b.appt.days === 0.5 ? `${KIND_LABEL[b.kind]}, halve dag` : KIND_LABEL[b.kind],
          time: b.appt.time,
          name: b.lead.customer.name,
          place: `${b.lead.customer.street}, ${b.lead.customer.city}`,
          tech: owner ? techLabel(b.appt.technician) : b.appt.technician,
          done: b.done,
          href: owner ? `/dashboard/${b.lead.id}?tab=afspraken` : `/technician/${b.lead.id}`,
          finishHref:
            (owner ? b.appt.technician === OWNER : true) && !b.done && b.lead.status.endsWith("_planned")
              ? `/technician/${b.lead.id}`
              : undefined,
          };
        }),
      items: items
        .filter((i) => itemDays(i).includes(day))
        .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""))
        .map((i) => ({
          id: i.id,
          kind: i.kind,
          title: i.title,
          description: i.description,
          start: i.start,
          end: i.end,
          date: i.date,
          date_to: i.date_to,
          who: i.who,
          whoLabel: owner ? techLabel(i.who) : i.who,
          short: i.who === OWNER ? "Eigenaar" : i.who.split(" ")[0],
          canEdit: owner || i.who === session.name || i.created_by === session.name,
        })),
      wishes: owner
        ? leads
            .filter((l) => l.status === "new" && l.preferred?.first.date === day)
            .map((l) => ({ id: l.id, name: l.customer.name, part: PART_LABEL[l.preferred!.first.part], href: `/dashboard/${l.id}?tab=afspraken` }))
        : [],
      techs: owner
        ? names.map((t) => {
            const off = offOn(allItems, t, day);
            const works = worksOn(roster, t, day);
            const count = bks.filter((b) => b.appt.technician === t && b.appt.date === day).length;
            const own = allItems.filter((i) => i.kind === "item" && i.who === t && itemDays(i).includes(day)).length;
            const free = freeSlots(bl, t, day, "visit");
            let text: string;
            if (off) text = `${off.title === "Ziek" ? "Ziek" : off.title === "Niet beschikbaar" ? "Niet beschikbaar" : `Niet beschikbaar: ${off.title}`}${off.date_to && off.date_to > off.date ? `, ${dayShort(off.date)} t/m ${dayShort(off.date_to)}` : ""}`;
            else if (!works) text = `Werkt niet op ${WEEKDAY_NAMES[weekdayIndex(day)]}`;
            else if (count + own === 0) text = "Geen afspraken";
            else text = free.length ? `${count + own} ${count + own === 1 ? "afspraak" : "afspraken"}, nog vrij om ${free.slice(0, 2).join(" en ")}` : "Vol gepland";
            return { tech: t, label: techLabel(t), text, works, offId: off?.id };
          })
        : [],
    };
  }

  const link = (mm: string) => `${base}?m=${mm}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-md text-4xl">Agenda</h1>
        <div className="flex items-center gap-1">
          <Link href={link(shiftMonth(month, -1))} className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface hover:bg-slate-50" aria-label="Vorige maand">
            <span aria-hidden="true">←</span>
          </Link>
          <p className="min-w-36 text-center text-base font-semibold first-letter:uppercase" aria-live="polite">
            {monthLong(first)}
          </p>
          <Link href={link(shiftMonth(month, 1))} className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface hover:bg-slate-50" aria-label="Volgende maand">
            <span aria-hidden="true">→</span>
          </Link>
          {month !== today.slice(0, 7) && (
            <Link href={link(today.slice(0, 7))} className="ml-2 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-brand hover:underline">
              Vandaag
            </Link>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        {owner ? "Klik op een dag om iets toe te voegen of te wijzigen." : "Klik op een dag om iets te delen met het team, zoals werkvoorbereiding of materiaal halen. Vrij vragen doet u bij Mijn rooster."}
      </p>

      <section aria-label={`Kalender ${monthLong(first)}`} className="mt-4 min-w-0">
        <AgendaCalendar
          key={month}
          cells={cells}
          month={month}
          today={today}
          days={days}
          owner={owner}
          me={session.name}
          team={names.map((n) => ({ name: n, label: techLabel(n) }))}
          initialDay={d}
        />
      </section>
    </>
  );
}
