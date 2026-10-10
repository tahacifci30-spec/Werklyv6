"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const links = [
  ["/#waarom", "Waarom Werkly"],
  ["/#functies", "Wat u krijgt"],
  ["/#werkwijze", "Hoe het werkt"],
  ["/#prijzen", "Prijzen"],
  ["/overons", "Over ons"],
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("a")?.focus();
    const toggle = button.current;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      toggle?.focus();
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white"
      >
        <span className="sr-only">{open ? "Menu sluiten" : "Menu openen"}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <nav
          ref={menu}
          id="mobile-menu"
          aria-label="Mobiel menu"
          className="enter-down absolute inset-x-0 top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-line bg-white px-4 pb-4 shadow-lg"
        >
          <ul className="divide-y divide-line">
            {links.map(([href, label]) => (
              <li key={href}>
                <Link href={href} onClick={() => setOpen(false)} className="flex min-h-12 items-center text-base font-medium">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/#demo" onClick={() => setOpen(false)} className="flex min-h-12 items-center text-base font-semibold text-brand-strong">
                Plan een gesprek
              </Link>
            </li>
            <li>
              <Link href="/login" className="flex min-h-12 items-center text-base font-medium text-muted">
                Inloggen
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
