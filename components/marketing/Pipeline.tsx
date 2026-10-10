"use client";

import { useEffect, useRef, useState } from "react";

type Step = { icon: React.ReactNode; title: string; text: string };

/**
 * "Hoe het werkt" als één doorlopende leiding, zoals de koelleiding tussen binnen- en buitenunit:
 * door de vijf stappen en met een bocht naar beneden het overzicht in. De leiding tekent zich één keer
 * als hij in beeld komt. Op een telefoon loopt hij verticaal.
 */
export function Pipeline({ steps, children }: { steps: Step[]; children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLSpanElement | null)[]>([]);
  const target = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState<{ d: string; w: number; h: number; end: { x: number; y: number; vertical: boolean } } | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const pts = nodes.current.filter(Boolean).map((n) => {
        const r = n!.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
      });
      const t = target.current?.getBoundingClientRect();
      if (pts.length < 2 || !t) return;
      const L = { left: t.left - box.left, right: t.right - box.left, top: t.top - box.top, height: t.height, cx: t.left - box.left + t.width / 2 };
      const r = 28;
      const first = pts[0];
      const last = pts[pts.length - 1];
      const horizontal = Math.abs(first.y - last.y) < 4;
      let d: string;
      let end: { x: number; y: number; vertical: boolean };
      if (horizontal) {
        // Door alle stappen, bocht naar beneden, en met een bocht naar links de zijkant van het scherm in.
        const ly = L.top + L.height * 0.42;
        const x = Math.max(last.x, L.right + r + 8);
        d = `M ${first.x} ${first.y} H ${x - r} A ${r} ${r} 0 0 1 ${x} ${first.y + r} V ${ly - r} A ${r} ${r} 0 0 1 ${x - r} ${ly} H ${L.right}`;
        end = { x: L.right, y: ly, vertical: false };
      } else {
        // Verticaal langs de stappen, dan een bocht naar het midden en het scherm in van boven.
        const turn = L.top - 36;
        d = `M ${first.x} ${first.y} V ${turn - r} A ${r} ${r} 0 0 0 ${first.x + r} ${turn} H ${L.cx - r} A ${r} ${r} 0 0 1 ${L.cx} ${turn + r} V ${L.top}`;
        end = { x: L.cx, y: L.top, vertical: true };
      }
      setPath({ d, w: box.width, h: box.height, end });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} data-in={inView} className="relative">
      {path && (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible" width={path.w} height={path.h}>
          <path d={path.d} fill="none" stroke="var(--brand-soft)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d={path.d}
            pathLength={1}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1"
            strokeDashoffset={inView ? 0 : 1}
            style={{ transition: "stroke-dashoffset 2200ms cubic-bezier(0.55, 0, 0.25, 1)" }}
          />
          {/* Koppeling waar de leiding het scherm in gaat */}
          <rect
            x={path.end.vertical ? path.end.x - 14 : path.end.x - 14}
            y={path.end.vertical ? path.end.y - 14 : path.end.y - 14}
            width="22"
            height="28"
            rx="4"
            fill="var(--signal)"
            transform={path.end.vertical ? `rotate(90 ${path.end.x} ${path.end.y})` : undefined}
            style={{ opacity: inView ? 1 : 0, transition: "opacity 300ms 2000ms" }}
          />
        </svg>
      )}

      <ol className="relative grid gap-10 lg:grid-cols-5 lg:gap-6">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-5 lg:flex-col-reverse lg:items-center lg:justify-start lg:text-center">
            <span
              ref={(n) => {
                nodes.current[i] = n;
              }}
              className="pipe-node relative grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full border-[6px] border-brand bg-surface text-brand-strong"
              style={{ transitionDelay: `${150 + i * 380}ms` }}
            >
              {s.icon}
              <span aria-hidden="true" className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-surface bg-signal" />
            </span>
            <span className="min-w-0 pt-1 lg:pb-3 lg:pt-0">
              <span className="block text-sm font-medium text-muted">Stap {i + 1}</span>
              <h3 className="display-md text-2xl">{s.title}</h3>
              <span className="mt-1 block text-muted">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div ref={target} className="relative mx-auto mt-24 max-w-3xl lg:mt-20">
        {children}
      </div>
    </div>
  );
}
