"use client";

import { useEffect } from "react";
import { smoothScrollTo } from "@/lib/smoothScroll";

/**
 * Laat alle links naar een plek op dezelfde pagina (#prijzen, #lijst, …) vloeiend scrollen met dezelfde
 * curve als de rest van de app, op web en telefoon. Links naar een andere pagina doen gewoon wat ze doen.
 */
export function SmoothAnchors() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || !href.includes("#")) return;
      const url = new URL(href, window.location.href);
      if (url.pathname !== window.location.pathname || url.search !== window.location.search || !url.hash) return;
      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!el) return;
      e.preventDefault();
      history.replaceState(history.state, "", url.hash);
      smoothScrollTo(el);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
