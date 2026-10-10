import type { Metadata } from "next";
import { markNotificationsSeen, openNotification } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { SubmitButton } from "@/components/SubmitButton";
import { dateTimeNl } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { isUnread, notices, type NoticeKind } from "@/lib/notifications";
import { getSettings, listAgendaItems, listLeads } from "@/lib/store";

export const metadata: Metadata = { title: "Meldingen" };
export const dynamic = "force-dynamic";

const TONE: Record<NoticeKind, string> = {
  nieuw: "#f5c542",
  akkoord: "#0f766e",
  afgewezen: "#94a3b8",
  moment: "#7cc4bb",
  terugbellen: "#f5c542",
  afgerond: "#0b3d3a",
  afgemeld: "#dc2626",
  rooster: "#7cc4bb",
  gesprek: "#0f766e",
};

/** Meldingen blijven nieuw tot u ze opent, of tot u alles als gelezen markeert. */
export default async function NotificationsPage() {
  const session = await requireSession("owner");
  const [leads, settings, items] = await Promise.all([listLeads(session.company_id), getSettings(session.company_id), listAgendaItems(session.company_id)]);
  const list = notices(leads, { roster: settings.roster, items });
  const unread = list.filter((n) => isUnread(n, settings.notifications_seen_at, settings.notifications_read)).length;

  return (
    <AppShell session={session}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-md text-4xl">Meldingen</h1>
          <p className="mt-1 text-muted">
            {unread === 0 ? "U bent helemaal bij." : `${unread} ${unread === 1 ? "nieuwe melding" : "nieuwe meldingen"}. Open een melding om hem af te vinken.`} Hier staat alleen wat u anders mist: een monteur die zich afmeldt, een klant die afwijst en een gesprek via de website. Uw taken staan bij Aan u.
          </p>
        </div>
        {unread > 0 && (
          <form action={markNotificationsSeen}>
            <SubmitButton variant="secondary" pendingText="Bezig…">Alles als gelezen markeren</SubmitButton>
          </form>
        )}
      </div>

      {list.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-surface p-6 text-muted">Nog geen meldingen.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {list.map((n) => {
            const fresh = isUnread(n, settings.notifications_seen_at, settings.notifications_read);
            return (
              <li key={n.id}>
                <form action={openNotification.bind(null, n.id, n.href)}>
                  <button
                    type="submit"
                    className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors duration-100 hover:bg-background active:bg-slate-100 ${fresh ? "bg-signal/10" : ""}`}
                  >
                    <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TONE[n.kind] }} />
                    <span className="min-w-0 flex-1">
                      <span className={`block ${fresh ? "font-semibold" : "font-medium text-muted"}`}>
                        {n.title}
                        {fresh && <span className="ml-2 rounded-md bg-signal px-1.5 py-0.5 align-middle text-[11px] font-bold text-petrol">Nieuw</span>}
                      </span>
                      <span className="block text-sm text-muted">{dateTimeNl(n.at)}</span>
                    </span>
                    <span aria-hidden="true" className="text-muted">›</span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
