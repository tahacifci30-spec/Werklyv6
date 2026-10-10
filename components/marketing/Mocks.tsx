/** Voorbeeldschermen op de website. Alleen om te laten zien, niet bedoeld om op te klikken. */

import { NavIcon } from "../SideNav";
import { ScaledScreen } from "./ScaledScreen";

function Frame({ caption, children, below = false, interactive = false }: { caption?: string; children: React.ReactNode; below?: boolean; interactive?: boolean }) {
  // Een scherm dat echt te bedienen is krijgt geen bijschrift en blijft bereikbaar voor muis, vinger en toetsenbord.
  if (interactive) return <div className="w-full">{children}</div>;
  return (
    <figure className={`mx-auto flex w-full ${below ? "flex-col-reverse" : "flex-col"}`}>
      <figcaption className={`${below ? "mt-4" : "mb-3"} flex items-center justify-center gap-2 text-sm font-medium text-muted`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {caption}
      </figcaption>
      <div aria-hidden="true" className="pointer-events-none select-none">
        {children}
      </div>
    </figure>
  );
}

export function PhoneMock({ caption, children, interactive }: { caption?: string; children: React.ReactNode; interactive?: boolean }) {
  return (
    <Frame caption={caption} interactive={interactive}>
      {/* iPhone 16: 147,6 x 71,6 mm, met statusbalk, Dynamic Island en thuisbalk */}
      <div className="relative mx-auto flex aspect-[71.6/147.6] w-[min(100%,280px)] flex-col overflow-hidden rounded-[3rem] border-[10px] border-slate-900 bg-background shadow-2xl ring-1 ring-slate-700/40">
        <div className="relative flex h-10 shrink-0 items-end justify-between px-6 pb-1 text-[11px] font-semibold text-slate-900">
          <span>9:41</span>
          <span className="absolute left-1/2 top-2 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-slate-900" />
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-px">
              {[3, 5, 7, 9].map((h) => (
                <span key={h} className="w-[2px] rounded-sm bg-slate-900" style={{ height: h }} />
              ))}
            </span>
            <span className="h-2.5 w-5 rounded-[3px] border border-slate-900 p-px">
              <span className="block h-full w-3/4 rounded-[1px] bg-slate-900" />
            </span>
          </span>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden px-4 pt-3">{children}</div>
        <div className="mx-auto mb-2 mt-1 h-1 w-24 shrink-0 rounded-full bg-slate-900" />
      </div>
    </Frame>
  );
}

/** Laptop met een scherm in 16:10 en een voet, voor het overzicht van de eigenaar. */
export function LaptopMock({ caption, children, interactive }: { caption?: string; children: React.ReactNode; interactive?: boolean }) {
  return (
    <Frame caption={caption} below interactive={interactive}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-t-2xl border-[8px] border-b-0 border-slate-900 bg-slate-900 shadow-2xl sm:border-[10px] sm:border-b-0">
          <div className="relative aspect-[16/11] overflow-hidden rounded-t-md bg-background">{children}</div>
        </div>
        <div className="relative mx-auto h-3 w-[104%] -translate-x-[2%] rounded-b-2xl bg-gradient-to-b from-slate-300 to-slate-400 shadow-lg sm:h-4">
          <span className="absolute left-1/2 top-0 h-1 w-20 -translate-x-1/2 rounded-b-md bg-slate-500/60" />
        </div>
      </div>
    </Frame>
  );
}

/** Het dashboard van de eigenaar, exact zoals in de app: op 1280 px breed opgebouwd en passend verkleind. */
export function OverviewScreen() {
  return (
    <ScaledScreen width={1280}>
      <DashboardReplica />
    </ScaledScreen>
  );
}

const TASKS: [string, string, string, string, string, boolean][] = [
  ["Ruben Evers", "Vught", "Installatie inplannen", "6 dagen geleden", "#145450", true],
  ["Lars Hendriks", "Breda", "Factuur controleren en versturen", "3 dagen geleden", "#145450", true],
  ["Sanne Peters", "Udenhout", "Installatie inplannen", "3 dagen geleden", "#145450", true],
  ["Jan de Vries", "Waalwijk", "Bezoek inplannen", "2 dagen geleden", "#f5c542", false],
  ["Rik Smeets", "Tilburg", "Bezoek inplannen", "1 dag geleden", "#f5c542", false],
  ["Stijn de Groot", "Helmond", "Installatie inplannen", "1 dag geleden", "#145450", false],
];

const KPIS: [string, string, string, string?][] = [
  ["Nieuwe aanvragen", "5", "22 binnen deze week"],
  ["Omzet deze maand", "€ 11.650", "t.o.v. vorige maand", "-12%"],
  ["Nog te ontvangen", "€ 14.330", "5 facturen open"],
];

const MONTHS: [string, number][] = [["mei", 62], ["jun", 78], ["jul", 55], ["aug", 70], ["sep", 92], ["okt", 48]];

const PHASES: [string, string, number][] = [
  ["Aanvraag", "#f5c542", 5],
  ["Bezoek", "#7cc4bb", 6],
  ["Offerte", "#0f766e", 8],
  ["Installatie", "#145450", 7],
  ["Factuur", "#0b3d3a", 5],
];

const sideItem = "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium";

function DashboardReplica() {
  return (
    <div className="flex h-[880px] bg-background text-foreground">
      {/* Zijbalk, zoals AppShell */}
      <div className="flex w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
        <div className="flex items-center justify-between gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/werkly-logo.svg" alt="" width={118} height={31} className="h-[31px] w-auto" />
          <span className="relative grid h-10 w-10 place-items-center rounded-xl text-muted">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
            </svg>
            <span className="tabular absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-bold leading-none text-petrol ring-2 ring-surface">9+</span>
          </span>
        </div>
        <div className="relative mt-6 flex min-h-11 items-center rounded-xl border border-line bg-background pl-9 pr-3 text-sm text-slate-500">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          Zoek een klant
        </div>

        <p className="mt-7 px-3 text-xs font-medium text-muted">Werk</p>
        <div className="mt-2 space-y-1">
          <div className={`${sideItem} bg-brand-soft text-petrol`}>
            <span className="absolute -left-3 bottom-2 top-2 w-1 rounded-r-full bg-brand" />
            <NavIcon name="requests" className="h-5 w-5 shrink-0 text-brand" />
            <span className="flex-1">Aanvragen</span>
            <span className="tabular grid h-6 min-w-6 place-items-center rounded-md bg-brand px-1 text-xs font-semibold text-white">13</span>
          </div>
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="agenda" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Agenda</span>
            <span className="tabular grid h-6 min-w-6 place-items-center rounded-md bg-background px-1 text-xs font-semibold text-foreground ring-1 ring-inset ring-line">2</span>
          </div>
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="revenue" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Omzet</span>
          </div>
        </div>

        <p className="mt-7 px-3 text-xs font-medium text-muted">Beheer</p>
        <div className="mt-2 space-y-1">
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="settings" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Instellingen</span>
          </div>
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="form" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Klantformulier</span>
            <span className="text-xs">↗</span>
          </div>
          <div className={`${sideItem} text-muted`}>
            <NavIcon name="export" className="h-5 w-5 shrink-0" />
            <span className="flex-1">Excel-export</span>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-line bg-background p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-petrol text-sm font-semibold text-white">E</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Eigenaar</span>
            <span className="block text-xs text-muted">Eigenaar</span>
          </span>
          <span className="grid h-10 w-10 place-items-center text-muted">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
            </svg>
          </span>
        </div>
      </div>

      {/* Inhoud, zoals app/dashboard/page.tsx */}
      <div className="min-w-0 flex-1 px-10 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              Werkly › <span className="font-medium text-foreground">Aanvragen</span>
            </p>
            <p className="display-md mt-1 text-4xl">Goedenavond</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium">
              <NavIcon name="agenda" className="h-4 w-4 text-muted" />
              Vrijdag 9 oktober
            </span>
            <span className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white">Agenda openen</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="flex flex-col justify-between rounded-2xl bg-petrol p-5 text-white">
            <span className="flex items-center justify-between text-sm font-medium text-teal-50/85">Aan u <span>›</span></span>
            <span className="tabular mt-4 text-4xl font-semibold tracking-tight">13</span>
            <span className="mt-3 text-sm text-teal-50/75">taken wachten op u</span>
          </div>
          {KPIS.map(([label, value, note, badge]) => (
            <div key={label} className="flex min-w-0 flex-col justify-between rounded-2xl border border-line bg-surface p-5">
              <span className="flex items-center justify-between text-sm font-medium text-muted">{label} <span>›</span></span>
              <span className="tabular mt-4 text-3xl font-semibold tracking-tight">{value}</span>
              <span className="mt-3 flex items-center gap-2 text-sm text-muted">
                {badge && <span className="tabular rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-800">{badge}</span>}
                {note}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4">
          <div className="rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between px-5 pt-5">
              <p className="text-base font-semibold">Aan u</p>
              <p className="text-sm font-medium text-brand-strong">Alle 13 bekijken</p>
            </div>
            <div className="mt-3 divide-y divide-line">
              {TASKS.map(([name, city, step, ago, color, late]) => (
                <div key={name} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{name}</span>
                    <span className="block truncate text-sm text-muted">{city}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-medium text-petrol">{step}</span>
                    <span className={`block text-xs ${late ? "font-medium text-amber-800" : "text-muted"}`}>{ago}</span>
                  </span>
                  <span className="text-muted">›</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-semibold">Vandaag</p>
              <span className="text-sm text-muted">2 afspraken</span>
            </div>
            <div className="mt-3 space-y-2">
              {[
                ["08:00", "Tom Bakker", "Installatie met Lars Visser"],
                ["10:00", "Anouk Verbeek", "Bezoek met Sven Bakker"],
              ].map(([time, name, sub]) => (
                <div key={name} className="flex items-center gap-3 rounded-xl bg-background p-3">
                  <span className="tabular w-12 shrink-0 text-lg font-semibold">{time}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{name}</span>
                    <span className="block truncate text-sm text-muted">{sub}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm font-medium text-muted">Hierna</p>
            <div className="mt-2 space-y-1">
              {[
                ["Za 10 okt", "", "test", "Overige, Ik zelf (eigenaar)"],
                ["Di 13 okt", "10:00", "Thijs Mulder", "Bezoek in Tilburg"],
              ].map(([day, time, title, sub]) => (
                <div key={title} className="flex items-baseline gap-3 px-1 py-1.5">
                  <span className="w-24 shrink-0 text-sm font-medium">
                    {day}
                    {time && <span className="tabular block text-xs font-normal text-muted">{time}</span>}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{title}</span>
                    <span className="block truncate text-xs text-muted">{sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">Omzet per maand</p>
              <p className="text-sm font-medium text-brand-strong">Alle cijfers</p>
            </div>
            <div className="mt-4 flex h-40 items-end gap-4">
              {MONTHS.map(([m, h], i) => (
                <div key={m} className="flex h-full flex-1 flex-col justify-end gap-2 text-center">
                  <span className={`rounded-t-md ${i === MONTHS.length - 1 ? "bg-brand" : "bg-brand/25"}`} style={{ height: `${h}%` }} />
                  <span className="text-xs text-muted">{m}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-base font-semibold">Lopende klussen per fase</p>
            <p className="mt-1 text-sm text-muted">31 lopend</p>
            <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-background">
              {PHASES.map(([label, color, count]) => (
                <span key={label} className="h-full" style={{ flexGrow: count, background: color }} />
              ))}
            </div>
            <div className="mt-5 space-y-2.5">
              {PHASES.map(([label, color, count]) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  <span className="flex-1">{label}</span>
                  <span className="tabular font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
