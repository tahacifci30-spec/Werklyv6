"use client";

import { useRef, useState } from "react";
import { durationLabel, estimateInstallDays } from "@/lib/duration";
import { DONT_KNOW, isComplete, nextQuestion, totalQuestions } from "@/lib/intake/questions";
import { estimatePrice, formatRange } from "@/lib/pricing/engine";
import { DEFAULT_RULES } from "@/lib/pricing/rules";
import { LaptopMock, PhoneMock } from "./Mocks";
import { ScaledScreen } from "./ScaledScreen";

const FORM = DEFAULT_RULES.form;
const DEVICES = ["telefoon", "laptop"] as const;

/**
 * Het klantformulier op de website, echt in te vullen. Eerst op een telefoon; veeg of tik door naar hetzelfde
 * formulier op een laptop. Beide schermen delen de antwoorden, zodat u ziet dat het één formulier is.
 * Er wordt niets verstuurd: na de laatste vraag ziet u de prijsindicatie die uw klant ook ziet.
 */
export function FormDemo() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [device, setDevice] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const choose = (q: string, o: string) => {
    setAnswers((a) => ({ ...a, [q]: o }));
    setOrder((l) => [...l, q]);
  };
  const back = () => {
    const last = order[order.length - 1];
    if (!last) return;
    setAnswers((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== last)));
    setOrder((l) => l.slice(0, -1));
  };
  const reset = () => {
    setAnswers({});
    setOrder([]);
  };
  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: calm ? "instant" : "smooth" });
  };

  const screen = { answers, order, choose, back, reset };

  return (
    <figure className="mx-auto w-full min-w-0">
      <div
        ref={scroller}
        onScroll={(e) => setDevice(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Het klantformulier op telefoon en laptop. Veeg opzij voor het andere scherm."
      >
        <div className="flex w-full shrink-0 snap-center items-center justify-center px-1 pb-8">
          <PhoneMock interactive>
            <DemoScreen {...screen} />
          </PhoneMock>
        </div>
        <div className="flex w-full shrink-0 snap-center items-center justify-center px-3 pb-8">
          <LaptopMock interactive>
            <ScaledScreen width={400}>
              <div className="flex h-[275px] flex-col px-6 py-3">
                <DemoScreen {...screen} wide />
              </div>
            </ScaledScreen>
          </LaptopMock>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        {DEVICES.map((d, i) => (
          <button key={d} type="button" onClick={() => go(i)} aria-label={`Toon ${d}`} className="grid h-8 w-8 place-items-center">
            <span className={`h-2 rounded-full transition-[width,background-color] duration-200 ${device === i ? "w-6 bg-brand" : "w-2 bg-slate-300"}`} />
          </button>
        ))}
      </div>
    </figure>
  );
}

function DemoScreen({
  answers,
  order,
  choose,
  back,
  reset,
  wide = false,
}: {
  answers: Record<string, string>;
  order: string[];
  choose: (q: string, o: string) => void;
  back: () => void;
  reset: () => void;
  wide?: boolean;
}) {
  const total = totalQuestions(FORM, answers);
  const q = nextQuestion(FORM, answers);

  if (isComplete(FORM, answers) || !q) {
    const estimate = estimatePrice(answers);
    return (
      <div className="flex flex-1 flex-col">
        <button type="button" onClick={back} className="min-h-9 self-start text-[11px] font-medium text-muted hover:text-foreground">
          ← Antwoord aanpassen
        </button>
        <div className={`rounded-2xl bg-brand-soft text-center ${wide ? "p-3" : "mt-2 p-4"}`}>
          <p className="text-xs font-medium text-brand-strong">Uw prijsindicatie</p>
          <p className={`tabular mt-1 font-semibold tracking-tight ${wide ? "text-2xl" : "text-xl"}`}>{formatRange(estimate)}</p>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-700">
            Inclusief montage en btw.{wide ? "" : ` Het plaatsen duurt naar verwachting ${durationLabel(estimateInstallDays(answers))}.`}
          </p>
        </div>
        <p className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-snug text-amber-900">
          <strong>Let op:</strong> dit is een indicatie. Na het bezoek van de monteur kan de offerte afwijken.
        </p>
        {!wide && (
          <p className="mt-3 text-[11px] leading-snug text-muted">
            Hierna vult uw klant zijn gegevens in. De aanvraag staat dan direct in uw overzicht, en u belt om het bezoek in te plannen.
          </p>
        )}
        <div className={`mt-auto pt-2.5 ${wide ? "" : "pb-3"}`}>
          <button type="button" onClick={reset} className={`w-full rounded-xl bg-brand text-sm font-semibold text-white transition-transform duration-100 active:scale-[0.97] ${wide ? "py-2.5" : "py-3"}`}>
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  const step = Math.min(order.length + 1, total);
  return (
    <div key={q.id} className="rise flex flex-1 flex-col">
      <div className="flex min-h-9 items-center justify-between text-[11px] font-medium text-muted">
        <button type="button" onClick={back} disabled={order.length === 0} className="min-h-9 pr-3 hover:text-foreground disabled:invisible">
          ← Terug
        </button>
        <span aria-live="polite">Vraag {step} van {total}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full origin-left rounded-full bg-brand transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ transform: `scaleX(${step / total})` }} />
      </div>
      <p className={`font-semibold leading-snug ${wide ? "mt-2.5 text-lg" : "mt-4 text-xl"}`}>{q.title}</p>
      <div className={`text-sm font-semibold ${wide ? "mt-2.5 grid grid-cols-2 gap-1.5" : "mt-3 space-y-2"}`}>
        {q.options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => choose(q.id, o.id)}
            className={`block w-full rounded-xl border border-line bg-white text-left transition-[background-color,border-color,transform] duration-100 hover:border-brand hover:bg-brand-soft active:scale-[0.98] ${wide ? "px-3 py-2" : "px-3 py-2.5"}`}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => choose(q.id, DONT_KNOW.id)}
          className={`block w-full rounded-xl border border-dashed border-slate-300 text-left text-muted transition-[background-color,border-color,transform] duration-100 hover:border-brand hover:bg-brand-soft active:scale-[0.98] ${wide ? "col-span-2 px-3 py-2" : "px-3 py-2.5"}`}
        >
          {DONT_KNOW.label}
        </button>
      </div>
    </div>
  );
}
