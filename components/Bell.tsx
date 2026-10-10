import Link from "next/link";

/** Belletje naar de meldingen. Bij nieuwe meldingen een rustig bolletje met het aantal, zonder animatie. */
export function Bell({ unread }: { unread: number }) {
  return (
    <Link
      href="/dashboard/meldingen"
      aria-label={unread ? `Meldingen, ${unread} nieuw` : "Meldingen"}
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted transition-colors duration-100 hover:bg-background hover:text-foreground active:scale-[0.96]"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
      </svg>
      {unread > 0 && (
        <span aria-hidden="true" className="absolute right-1 top-1 grid">
          <span className="tabular col-start-1 row-start-1 grid h-4 min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-bold leading-none text-petrol ring-2 ring-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        </span>
      )}
    </Link>
  );
}
