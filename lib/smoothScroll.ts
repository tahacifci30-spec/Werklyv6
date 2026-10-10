/**
 * Vloeiend scrollen naar een element, met een eigen curve in plaats van die van de browser.
 * De browser-variant verschilt per apparaat en hapert soms als er tegelijk inhoud verandert;
 * deze loopt op de schermverversing (requestAnimationFrame), stopt als de gebruiker zelf scrolt,
 * en springt direct bij "minder beweging".
 */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let running = 0;

export function smoothScrollTo(el: HTMLElement | null, offset = 16) {
  if (!el) return;
  const marginTop = parseFloat(getComputedStyle(el).scrollMarginTop) || offset;
  const target = Math.max(0, el.getBoundingClientRect().top + window.scrollY - marginTop);
  const start = window.scrollY;
  const distance = target - start;
  if (Math.abs(distance) < 2) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: target, behavior: "instant" });
    return;
  }

  // Langere afstand iets langer, maar altijd tussen 300 en 600 ms.
  const duration = Math.min(600, Math.max(300, Math.abs(distance) * 0.6));
  const id = ++running;
  const t0 = performance.now();

  // De gebruiker neemt het over: stop met onze animatie.
  const cancel = () => {
    running++;
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
  };
  window.addEventListener("wheel", cancel, { passive: true, once: true });
  window.addEventListener("touchstart", cancel, { passive: true, once: true });

  const step = (now: number) => {
    if (id !== running) return;
    const p = Math.min(1, (now - t0) / duration);
    window.scrollTo({ top: start + distance * easeInOut(p), behavior: "instant" });
    if (p < 1) requestAnimationFrame(step);
    else cancel();
  };
  requestAnimationFrame(step);
}
