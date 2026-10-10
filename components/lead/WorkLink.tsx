"use client";

import { useRouter } from "next/navigation";
import { smoothScrollTo } from "@/lib/smoothScroll";

/**
 * Knop naar een tab van het dossier die altijd vloeiend naar het werkgedeelte (#werkvak) scrolt:
 * ook als die tab al open is, en ook na meerdere keren klikken. Bij een andere tab start het scrollen
 * zodra de nieuwe inhoud er staat, zodat de beweging in één keer doorloopt.
 */
export function WorkLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <a
      href={`${href}#werkvak`}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        const target = new URL(href, window.location.href);
        const sameTab = target.pathname === window.location.pathname && target.search === window.location.search;
        if (sameTab) {
          smoothScrollTo(document.getElementById("werkvak"));
          return;
        }
        router.push(href, { scroll: false });
        // Scroll pas als de nieuwe tab er staat, anders is de pagina nog te kort en stopt de beweging halverwege.
        // Daarna nog wachten tot de browser klaar is met opbouwen (twee vlotte frames op rij), anders hapert de start.
        const tab = target.searchParams.get("tab");
        const t0 = performance.now();
        let prev = t0;
        let calm = 0;
        let readyAt = 0;
        const wait = (now: number) => {
          const el = document.getElementById("werkvak");
          const ready = el?.dataset.tab === tab;
          if (ready && !readyAt) readyAt = now;
          calm = ready && now - prev < 24 ? calm + 1 : 0;
          prev = now;
          // Vangnet voor trage telefoons: uiterlijk 500 ms nadat de tab er staat toch beginnen.
          if (el && ready && (calm >= 2 || now - readyAt > 500)) smoothScrollTo(el);
          else if (now - t0 < 4000) requestAnimationFrame(wait);
        };
        requestAnimationFrame(wait);
      }}
    >
      {children}
    </a>
  );
}
