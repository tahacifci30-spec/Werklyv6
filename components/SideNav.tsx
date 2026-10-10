"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, string> = {
  requests: "M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v6H4z",
  agenda: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  revenue: "M5 20V10M12 20V4M19 20v-7",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z",
  visits: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  form: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 8h6M9 12h6M9 16h3",
  export: "M12 3v12M7 10l5 5 5-5M5 21h14",
  roster: "M4 5h16v15H4zM4 10h16M9 5v15M15 5v15",
};

export function NavIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

/** Menu-item in de zijbalk: icoon, naam en eventueel een teller. Actief als het pad ermee begint. */
export function SideNavLink({
  href,
  icon,
  label,
  count,
  except,
}: {
  href: string;
  icon: string;
  label: string;
  /** Teller rechts, bijvoorbeeld het aantal taken dat op u wacht */
  count?: number;
  except?: string[];
}) {
  const pathname = usePathname();
  const active = pathname.startsWith(href) && !except?.some((e) => pathname.startsWith(e));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition-colors duration-100 ${
        active ? "bg-brand-soft text-petrol" : "text-muted hover:bg-background hover:text-foreground"
      }`}
    >
      {active && <span aria-hidden="true" className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-brand" />}
      <NavIcon name={icon} className={`h-5 w-5 shrink-0 ${active ? "text-brand" : ""}`} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!!count && (
        <span className={`tabular grid h-6 min-w-6 place-items-center rounded-md px-1 text-xs font-semibold ${active ? "bg-brand text-white" : "bg-background text-foreground ring-1 ring-inset ring-line"}`}>
          {count}
        </span>
      )}
    </Link>
  );
}
