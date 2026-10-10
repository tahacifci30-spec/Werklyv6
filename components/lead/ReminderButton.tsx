"use client";

import { useTransition } from "react";
import { markReminded } from "@/app/actions";

/**
 * Stuurt de klant een herinnering via WhatsApp en legt vast dat dat gebeurd is, zodat u het niet twee keer doet.
 * WhatsApp opent met het bericht al ingevuld; u hoeft alleen nog op versturen te tikken.
 */
export function ReminderButton({ id, kind, href, done }: { id: string; kind: "visit" | "install"; href: string; done: boolean }) {
  const [pending, start] = useTransition();
  if (done) {
    return <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">Herinnerd</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => start(async () => markReminded(id, kind))}
      aria-busy={pending}
      className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-brand-soft px-3 text-sm font-semibold text-brand-strong transition-[background-color,color,transform] duration-100 hover:bg-brand hover:text-white active:scale-[0.96]"
    >
      Herinner
    </a>
  );
}
