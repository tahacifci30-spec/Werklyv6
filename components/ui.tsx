import Link from "next/link";
import { STATUS_LABEL, phaseColor } from "@/lib/workflow";
import type { LeadStatus } from "@/lib/types";

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center" aria-label="Werkly, naar de startpagina">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={light ? "/brand/werkly-logo-inverse.svg" : "/brand/werkly-logo.svg"}
        alt="Werkly"
        width={118}
        height={31}
        className="h-[31px] w-auto"
      />
    </Link>
  );
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-inset ring-line">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: phaseColor(status) }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export const btn = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[background-color,border-color,color,transform] duration-100 ease-out active:scale-[0.97] hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition-[background-color,border-color,color,transform] duration-100 ease-out active:scale-[0.97] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition-[background-color,border-color,color,transform] duration-100 ease-out active:scale-[0.97] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50",
};

export const field =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-foreground placeholder:text-slate-500 focus:border-brand";

export function Card({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-base font-semibold text-foreground">{children}</h2>
  );
}

export const dateNl = (iso: string) =>
  new Date(iso).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" });
export const dateTimeNl = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export const dayNl = (yyyyMmDd: string) =>
  new Date(`${yyyyMmDd}T12:00:00`).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
