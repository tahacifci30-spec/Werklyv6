"use client";

import { useEffect } from "react";

/**
 * Safari op iPhone toont de ingedrukte staat (:active) alleen als de pagina naar aanraking luistert.
 * Deze lege, passieve luisteraar zorgt dat knoppen direct bij aanraken reageren, niet pas bij loslaten.
 */
export function TouchActive() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  return null;
}
