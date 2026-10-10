"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Toont een scherm dat op ware grootte is opgebouwd (bijvoorbeeld 1280 px breed) verkleind in de ruimte
 * die er is, zodat een voorbeeld op de website exact dezelfde verhoudingen heeft als de echte app.
 */
export function ScaledScreen({ width, children }: { width: number; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden">
      <div style={{ width, transform: `scale(${scale})`, transformOrigin: "top left", visibility: scale ? "visible" : "hidden" }}>
        {children}
      </div>
    </div>
  );
}
