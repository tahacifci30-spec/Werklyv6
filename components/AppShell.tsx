import Link from "next/link";
import { logout } from "@/app/actions";
import { bookings, OWNER } from "@/lib/agenda";
import { todayNl } from "@/lib/dates";
import { unreadCount } from "@/lib/notifications";
import { getSettings, listAgendaItems, listLeads } from "@/lib/store";
import type { Session } from "@/lib/types";
import { isOwnerTurn } from "@/lib/workflow";
import { Bell } from "./Bell";
import { BottomNav } from "./BottomNav";
import { NavIcon, SideNavLink } from "./SideNav";
import { Logo } from "./ui";

/**
 * De schil van de app. Op een groot scherm een vaste zijbalk met de onderdelen en tellers die ertoe doen
 * (wat op u wacht, afspraken vandaag); op een telefoon een balk bovenaan en de navigatie onderaan.
 */
export async function AppShell({
  session,
  children,
  wide = false,
}: {
  session: Session;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const owner = session.role === "owner";
  const home = owner ? "/dashboard" : "/technician";
  const today = todayNl();
  const [leads, settings, items] = await Promise.all([
    listLeads(session.company_id),
    owner ? getSettings(session.company_id) : null,
    owner ? listAgendaItems(session.company_id) : [],
  ]);
  const unread = owner && settings ? unreadCount(leads, settings.notifications_seen_at, settings.notifications_read, { roster: settings.roster, items }) : 0;
  const rosterOpen = settings ? settings.roster.filter((r) => r.status === "pending").length : 0;
  const mine = (tech: string) => owner || tech === session.name;
  const todayCount = bookings(leads).filter((b) => b.appt.date === today && !b.done && mine(b.appt.technician)).length;
  const ownerTurn = owner ? leads.filter(isOwnerTurn).length : 0;
  const initials = (owner ? OWNER : session.name)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        Naar hoofdinhoud
      </a>
      <div className="flex min-h-dvh">
        {/* Zijbalk (vanaf laptopbreedte) */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex print:hidden">
          <div className="flex items-center justify-between gap-2 px-2">
            <Logo href={home} />
            {owner && <Bell unread={unread} />}
          </div>

          {owner && (
            <form role="search" action="/dashboard" className="relative mt-6">
              <label htmlFor="side-q" className="sr-only">Zoek een klant</label>
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="side-q"
                name="q"
                type="search"
                autoComplete="off"
                placeholder="Zoek een klant"
                className="min-h-11 w-full rounded-xl border border-line bg-background pl-9 pr-3 text-sm placeholder:text-slate-500 focus:border-brand"
              />
            </form>
          )}

          <nav aria-label="Hoofdnavigatie" className="mt-7 flex-1 overflow-y-auto">
            <p className="px-3 text-xs font-medium text-muted">Werk</p>
            <ul className="mt-2 space-y-1">
              {owner ? (
                <>
                  <li>
                    <SideNavLink href="/dashboard" icon="requests" label="Aanvragen" count={ownerTurn} except={["/dashboard/agenda", "/dashboard/rooster", "/dashboard/revenue", "/dashboard/settings"]} />
                  </li>
                  <li>
                    <SideNavLink href="/dashboard/agenda" icon="agenda" label="Agenda" count={todayCount} />
                  </li>
                  <li>
                    <SideNavLink href="/dashboard/rooster" icon="roster" label="Rooster" count={rosterOpen} />
                  </li>
                  <li>
                    <SideNavLink href="/dashboard/revenue" icon="revenue" label="Omzet" />
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <SideNavLink href="/technician" icon="visits" label="Mijn werk" count={todayCount} except={["/technician/rooster"]} />
                  </li>
                  <li>
                    <SideNavLink href="/technician/rooster" icon="roster" label="Mijn rooster" />
                  </li>
                </>
              )}
            </ul>

            {owner && (
              <>
                <p className="mt-7 px-3 text-xs font-medium text-muted">Beheer</p>
                <ul className="mt-2 space-y-1">
                  <li>
                    <SideNavLink href="/dashboard/settings" icon="settings" label="Instellingen" />
                  </li>
                  <li>
                    <Link href="/intake" target="_blank" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium text-muted transition-colors duration-100 hover:bg-background hover:text-foreground">
                      <NavIcon name="form" />
                      <span className="flex-1">Klantformulier</span>
                      <span aria-hidden="true" className="text-xs">↗</span>
                    </Link>
                  </li>
                  <li>
                    <a href="/dashboard/export" download className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium text-muted transition-colors duration-100 hover:bg-background hover:text-foreground">
                      <NavIcon name="export" />
                      Excel-export
                    </a>
                  </li>
                </ul>
              </>
            )}
          </nav>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-background p-3">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-petrol text-sm font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{owner ? OWNER : session.name}</span>
              <span className="block text-xs text-muted">{owner ? "Eigenaar" : "Monteur"}</span>
            </span>
            <form action={logout}>
              <button type="submit" aria-label="Uitloggen" className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
                </svg>
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Balk bovenaan op telefoon en tablet */}
          <header className="material sticky top-0 z-30 border-b border-line/60 lg:hidden print:hidden">
            <div className="flex h-14 items-center justify-between gap-2 px-4">
              <Logo href={home} />
              <div className="flex items-center gap-1">
              {owner && <Bell unread={unread} />}
              <form action={logout}>
                <button type="submit" className="min-h-11 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-slate-100 hover:text-foreground">
                  Uitloggen
                </button>
              </form>
              </div>
            </div>
          </header>
          <main
            id="main"
            className={`mx-auto w-full min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-10 lg:pb-10 ${wide ? "max-w-7xl" : "max-w-3xl"}`}
          >
            {children}
          </main>
        </div>
      </div>
      <BottomNav role={owner ? "owner" : "technician"} />
    </>
  );
}
