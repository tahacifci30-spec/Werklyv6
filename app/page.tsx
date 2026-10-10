import Link from "next/link";
import { DemoForm } from "@/components/marketing/DemoForm";
import { FormDemo } from "@/components/marketing/FormDemo";
import { LaptopMock, OverviewScreen } from "@/components/marketing/Mocks";
import { Pipeline } from "@/components/marketing/Pipeline";
import { RoiCalculator } from "@/components/marketing/RoiCalculator";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { WhySection } from "@/components/marketing/WhySection";
import { btn } from "@/components/ui";
import { WERKLY } from "@/lib/company";
import { BEDRIJF_CUSTOM, PLANS } from "@/lib/plans";

const DEMO = "#demo";

const icons: Record<string, string> = {
  form: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 8h6M9 12h6M9 16h3",
  overview: "M4 5h16M4 12h16M4 19h10",
  agenda: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  monteur: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM11 18h2M9 8l2 2 4-4",
  invoice: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  revenue: "M5 20V10M12 20V4M19 20v-7",
  visit: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  quote: "M7 3h10l3 3v15H7zM10 12h7M10 16h7",
  install: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
};

/** Kleine verschuiving zodat het icoon optisch in het midden van zijn vlak staat. */
const NUDGE: Record<string, string> = { quote: "translate(-1.5 0)" };

function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[name]} transform={NUDGE[name]} />
    </svg>
  );
}

const features = [
  ["form", "Klantformulier", "De klant ziet direct een prijsindicatie."],
  ["overview", "Overzicht", "Elke aanvraag met de volgende stap."],
  ["agenda", "Agenda", "Alle afspraken en vrije tijden op één plek."],
  ["monteur", "Checklist voor de monteur", "Foto's, serienummers en meerwerk vastleggen op de telefoon."],
  ["invoice", "Offerte en factuur", "Controleren, versturen, betaald."],
  ["revenue", "Omzet", "Per dag, week, maand en jaar."],
];

const steps = [
  ["form", "Aanvraag", "De klant vult het formulier in."],
  ["visit", "Bezoek", "De monteur controleert ter plekke."],
  ["quote", "Offerte", "U controleert en verstuurt."],
  ["install", "Installatie", "De monteur voert de klus uit."],
  ["invoice", "Factuur", "Versturen, betaald, klaar."],
];

/** Wat installateurs herkennen, en wat Werkly eraan doet. */
const pains = [
  [
    "Geen tijd om binnen een dag een offerte te sturen, omdat u onderweg bent of bij klanten zit.",
    "De klant ziet direct een prijsindicatie. Na het bezoek staat de conceptofferte klaar: controleren en versturen vanaf uw telefoon.",
  ],
  ["Offertes overtikken in Word of Excel.", "Uw prijzen en vaste producten staan erin. De offerte vult zichzelf, u past alleen aan wat anders is."],
  ["Meerwerk dat op de factuur vergeten wordt.", "De monteur legt meerwerk vast op locatie. Het staat vanzelf op de factuur."],
];

const faq = [
  ["Wat is Werkly?", "Werkly is software voor installatiebedrijven. U gaat met één programma van aanvraag naar offerte, installatie en factuur."],
  ["Wat als een klant iets niet weet?", "Dan kiest de klant ‘Weet ik niet’. De aanvraag blijft bruikbaar en de monteur controleert het bij het bezoek."],
  ["Gaat er een offerte weg zonder goedkeuring?", "Nee. U controleert en keurt elke offerte en elke factuur zelf goed. Vraagt de klant later extra werk, dan past u de offerte aan en geeft de klant opnieuw akkoord."],
  ["Moet ik eerst een cursus volgen?", "Nee. Wij richten Werkly bij de opstart voor u in, met uw prijzen en producten. U werkt dezelfde dag met het overzicht."],
  ["Kan ik koppelen met mijn boekhouding?", "Een koppeling met SnelStart en andere boekhoudprogramma’s komt eraan. Tot die tijd exporteert u uw aanvragen naar Excel."],
  ["Kan ik mijn eigen prijzen instellen?", "Ja. U bepaalt zelf de vragen in het klantformulier en wat elk antwoord kost, of u nu rekent in m², m³ of iets anders. De prijsindicatie en de conceptofferte volgen daaruit."],
  ["Waar zijn de opstartkosten voor?", "Voor het inrichten: uw prijsregels, bedrijfsgegevens en klantformulier. Bij Team en Bedrijf ook training en het overzetten van lopende aanvragen."],
  ["Voor wie is het?", "Voor installatiebedrijven. We beginnen bij airco- en klimaatinstallateurs en bouwen uit naar andere vakgebieden."],
];

export default function MarketingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main">
        {/* Kop: de belofte als typeplaatje, met ernaast wat de klant ziet */}
        <section className="overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:pb-24 lg:pt-20">
            <div>
              <h1 className="display text-[clamp(3.4rem,11vw,7.5rem)] text-foreground">
                Van aanvraag
                <br />
                tot factuur.
              </h1>
              <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-muted sm:text-xl">
                Werkly neemt installatiebedrijven het kantoorwerk uit handen: van de eerste aanvraag tot offerte, uitvoering en
                factuur. Minder tijd achter de laptop, meer tijd voor klussen.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a href={DEMO} className={`${btn.primary} min-h-12 px-6 text-base`}>Plan een gesprek</a>
                <Link href="/intake" className="inline-flex min-h-12 items-center px-3 text-base font-semibold text-brand-strong underline decoration-2 underline-offset-[6px] hover:decoration-brand">
                  Probeer het klantformulier
                </Link>
              </div>
              <p className="mt-5 text-sm text-muted">Geen cursus nodig. Wij richten alles voor u in, met uw eigen prijzen.</p>
            </div>
            <FormDemo />
          </div>
        </section>

        {/* Het probleem en het grootste verschil: geen CRM en geen losse offertetool */}
        <section aria-labelledby="usp" className="bg-petrol text-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
            <div>
              <h2 id="usp" className="display text-5xl sm:text-6xl">Geen CRM. Geen losse offertetool.</h2>
              <p className="mt-5 max-w-md text-lg text-teal-50/85">
                Eén programma voor het hele traject van een installatieklus. Ingericht door ons, dus u kunt dezelfde dag beginnen.
              </p>
              <a href="#vergelijking" className="mt-7 inline-flex min-h-11 items-center font-semibold text-white underline decoration-signal decoration-2 underline-offset-[6px] hover:decoration-white">
                Bekijk de vergelijking
              </a>
            </div>
            <ul className="space-y-6">
              {pains.map(([pain, fix]) => (
                <li key={pain} className="grid gap-2 border-l-4 border-signal pl-5">
                  <p className="text-lg font-semibold">{pain}</p>
                  <p className="text-teal-50/80">{fix}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Waarom Werkly: wat het oplevert en de vergelijking */}
        <WhySection />

        {/* Wat u krijgt: een rustige lijst, geen rij kaartjes */}
        <section id="functies" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
            <div>
              <h2 className="display-md text-4xl sm:text-5xl">Wat u krijgt</h2>
              <p className="mt-4 max-w-sm text-muted">Alles wat tussen de eerste vraag van de klant en de betaalde factuur gebeurt, in één programma.</p>
              <Link href="/intake" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong underline decoration-2 underline-offset-4">
                Vul het formulier in zoals uw klant het ziet
              </Link>
            </div>
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {features.map(([icon, title, text]) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 shrink-0 text-brand">
                    <Icon name={icon} className="h-7 w-7" />
                  </span>
                  <span className="min-w-0">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <span className="block text-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Hoe het werkt: de leiding van aanvraag tot factuur, uitkomend in het overzicht */}
        <section id="werkwijze" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
            <h2 className="display-md text-4xl sm:text-5xl">Hoe het werkt</h2>
            <p className="mt-4 max-w-xl text-muted">Eén lijn van de eerste aanvraag tot de betaalde factuur. Alles komt samen in uw overzicht.</p>
            <div className="mt-14">
              <Pipeline steps={steps.map(([icon, title, text]) => ({ icon: <Icon name={icon} className="h-6 w-6" />, title, text }))}>
                <LaptopMock caption="Uw overzicht">
                  <OverviewScreen />
                </LaptopMock>
              </Pipeline>
            </div>
            <p className="mt-12 text-center text-muted">
              Benieuwd hoeveel tijd dit u scheelt?{" "}
              <a href="#rekentool" className="font-semibold text-brand-strong underline decoration-2 underline-offset-4">
                Reken het uit in een minuut
              </a>
            </p>
          </div>
        </section>

        {/* Rekentool: wat levert het op */}
        <section id="rekentool" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
            <h2 className="display-md text-4xl sm:text-5xl">Reken zelf uit wat het oplevert</h2>
            <p className="mt-4 max-w-2xl text-muted">Vier getallen, direct uitkomst. Pas ze aan naar uw eigen bedrijf.</p>
            <div className="mt-8">
              <RoiCalculator />
            </div>
          </div>
        </section>

        {/* Over ons */}
        <section aria-label="Over ons" className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
          <Link href="/overons" className="group flex items-center gap-5 rounded-[1.75rem] border border-line bg-surface p-7 transition-[border-color,transform] duration-100 hover:border-brand/50 active:scale-[0.99]">
            <span className="flex shrink-0 -space-x-3" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/team/taha.jpg" alt="" width={64} height={64} loading="lazy" className="h-16 w-16 rounded-full object-cover ring-4 ring-surface" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/team/joaquin.jpg" alt="" width={64} height={64} loading="lazy" className="h-16 w-16 rounded-full object-cover ring-4 ring-surface" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-muted">Over ons</span>
              <span className="display-md mt-1 block text-2xl sm:text-3xl">Wie er achter Werkly zitten</span>
              <span className="mt-2 inline-flex items-center gap-2 font-semibold text-brand-strong">
                Maak kennis <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">›</span>
              </span>
            </span>
          </Link>
        </section>

        {/* Prijzen */}
        <section id="prijzen" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
            <h2 className="display-md text-4xl sm:text-5xl">Kies uw pakket</h2>
            <p className="mt-4 max-w-xl text-muted">
              Alle bedragen zijn exclusief btw. Maandelijks opzegbaar. Eenmalige opstartkosten voor het inrichten. Bij Bedrijf hangt de prijs af van wat u nodig heeft. Twijfelt u welk pakket past?{" "}
              <a href={WERKLY.phone ? `tel:${WERKLY.phone.replace(/\s/g, "")}` : DEMO} className="font-semibold text-brand-strong underline decoration-2 underline-offset-4">
                {WERKLY.phone ? "Bel ons even" : "Plan een kort gesprek"}
              </a>
              .
            </p>
            <div className="mt-12 grid items-start gap-5 lg:grid-cols-3">
              {PLANS.map((p) => {
                const dark = !!p.highlight;
                return (
                  <article
                    key={p.id}
                    aria-labelledby={`plan-${p.id}`}
                    className={`rounded-[1.75rem] p-7 ${dark ? "bg-petrol text-white lg:-mt-4 lg:pb-11 lg:pt-11" : "border border-line bg-background"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 id={`plan-${p.id}`} className="display-md text-3xl">{p.name}</h3>
                        <p className={`mt-1 text-sm ${dark ? "text-teal-100/80" : "text-muted"}`}>{p.audience}</p>
                      </div>
                      {dark && <span className="shrink-0 rounded-full bg-signal px-3 py-1 text-xs font-semibold text-petrol">Meest gekozen</span>}
                    </div>

                    <p className="mt-7">
                      {p.monthly ? (
                        <>
                          {p.from && <span className={`mr-2 text-lg font-semibold ${dark ? "text-teal-100/80" : "text-muted"}`}>Vanaf</span>}
                          <span className="display tabular text-6xl">{p.monthly}</span>
                          <span className={dark ? "text-teal-100/80" : "text-muted"}> per maand</span>
                        </>
                      ) : (
                        <span className="display-md text-3xl">Neem contact op</span>
                      )}
                    </p>
                    <p className={`mt-2 text-sm ${dark ? "text-teal-100/80" : "text-muted"}`}>
                      {p.setup ? <>Opstartkosten eenmalig {p.from ? "vanaf " : ""}<strong className={`tabular ${dark ? "text-white" : "text-foreground"}`}>{p.setup}</strong></> : "Prijs en opstart op maat"}
                    </p>

                    <ul className="mt-6 space-y-2.5 text-sm">
                      {p.why.map((w) => (
                        <li key={w} className="flex gap-2.5">
                          <Check light={dark} /> <span>{w}</span>
                        </li>
                      ))}
                    </ul>

                    <details className={`group mt-6 border-t pt-4 ${dark ? "border-white/15" : "border-line"}`}>
                      <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden ${dark ? "text-white" : "text-brand-strong"}`}>
                        Wat zit erin?
                        <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">+</span>
                      </summary>
                      <div className="mt-2 text-sm">
                        <p className="font-semibold">{p.lead}</p>
                        <ul className="mt-2 space-y-2">
                          {p.includes.map((i) => (
                            <li key={i} className="flex gap-2.5">
                              <Check light={dark} /> <span>{i}</span>
                            </li>
                          ))}
                        </ul>
                        {p.id === "bedrijf" && (
                          <>
                            <p className="mt-4 font-semibold">Samen te bespreken:</p>
                            <ul className="mt-2 list-inside list-disc space-y-1 text-muted">
                              {BEDRIJF_CUSTOM.map((i) => <li key={i}>{i}</li>)}
                            </ul>
                          </>
                        )}
                        <p className="mt-4 font-semibold">In de opstartkosten</p>
                        <p className={dark ? "text-teal-100/80" : "text-muted"}>{p.setupIncludes}</p>
                        {p.soon.length > 0 && (
                          <>
                            <p className="mt-4 font-semibold">Binnenkort</p>
                            <ul className={`mt-1 list-inside list-disc ${dark ? "text-teal-100/80" : "text-muted"}`}>
                              {p.soon.map((i) => <li key={i}>{i}</li>)}
                            </ul>
                          </>
                        )}
                      </div>
                    </details>

                    <a
                      href={DEMO}
                      className={`mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg px-5 text-sm font-semibold transition-colors ${
                        dark ? "bg-white text-petrol hover:bg-teal-50" : "border border-foreground/20 bg-surface text-foreground hover:border-foreground/40"
                      }`}
                    >
                      {p.from ? "Neem contact op" : "Plan een gesprek"}
                    </a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="demo" className="scroll-mt-16 bg-petrol text-white">
          <div className="mx-auto grid max-w-6xl items-start gap-12 px-4 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-24">
            <div>
              <ContactVisual />
              <h2 className="display mt-8 text-5xl sm:text-6xl">Kom met ons in contact.</h2>
              <p className="mt-5 max-w-md text-lg text-teal-50/85">
                Kies zelf een moment uit onze agenda. Het gesprek staat direct vast en wij bellen u op dat tijdstip.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  ["agenda", "U kiest het moment", "Direct uit onze agenda, zonder heen en weer mailen."],
                  ["visit", "Wij kijken naar uw manier van werken", "Met uw soort klussen en uw prijzen."],
                  ["quote", "Vrijblijvend", "Pas bij akkoord begint de opstart."],
                ].map(([icon, title, text]) => (
                  <li key={title} className="flex items-start gap-4">
                    <span className="mt-0.5 text-signal">
                      <Icon name={icon} className="h-6 w-6" />
                    </span>
                    <span>
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-teal-50/70">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/intake" className="mt-8 inline-flex min-h-11 items-center font-semibold text-white underline decoration-signal decoration-2 underline-offset-[6px] hover:decoration-white">
                Probeer eerst het klantformulier
              </Link>
            </div>
            <DemoForm />
          </div>
        </section>

        {/* Vragen */}
        <section id="vragen" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
            <h2 className="display-md text-4xl sm:text-5xl">Vragen</h2>
            <div className="divide-y divide-line border-y border-line">
              {faq.map(([q, a]) => (
                <details key={q} className="group py-2">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-xl text-brand-strong transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-2xl pb-4 text-muted">{a}</p>
                </details>
              ))}
              <p className="py-5 text-muted">
                Staat uw vraag er niet bij?{" "}
                <a href={`mailto:${WERKLY.email}`} className="font-semibold text-brand-strong underline decoration-2 underline-offset-4">
                  Mail ons
                </a>{" "}
                en u krijgt binnen een werkdag antwoord.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/** Beeld bij het contactblok: een agenda met vinkje en een tekstballon. */
function ContactVisual() {
  return (
    <div className="relative h-32 w-64" aria-hidden="true">
      <div className="absolute left-0 top-4 grid h-24 w-24 -rotate-6 place-items-center rounded-[1.75rem] bg-brand text-white ring-1 ring-white/15">
        <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      </div>
      <div className="absolute left-[4.5rem] top-0 whitespace-nowrap rounded-2xl rounded-bl-sm bg-white px-5 py-3 text-base font-semibold text-petrol">
        Hallo! Wanneer past het?
      </div>
      <span className="absolute bottom-2 left-28 flex gap-1 rounded-full bg-white/10 px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
      </span>
    </div>
  );
}

function Check({ light = false }: { light?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`mt-0.5 h-5 w-5 shrink-0 ${light ? "text-signal" : "text-brand"}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}
