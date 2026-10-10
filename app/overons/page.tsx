import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { btn } from "@/components/ui";
import { WERKLY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Over ons",
  description: "Twee studenten Communication & Multimedia Design die software maken voor installatiebedrijven.",
};

/**
 * Teksten over het team. Pas ze aan zodat ze kloppen met wat jullie echt studeren en doen.
 */
const TEAM = [
  {
    name: "Taha Cifci",
    age: 21,
    role: "Ontwerp en techniek",
    photo: "/team/taha.jpg",
    study: "HBO Bachelor Communication & Multimedia Design",
    bio: "Taha ontwerpt en bouwt Werkly. In zijn opleiding leert hij software te maken vanuit de gebruiker: eerst uitzoeken wat mensen echt nodig hebben, dan een prototype maken en dat testen. Die aanpak zie je terug in het klantformulier dat een klant in een minuut invult, en in een overzicht waarin de eigenaar direct ziet wat de volgende stap is.",
    skills: [
      "Interactieontwerp: schermen die niemand hoeft uit te leggen",
      "Prototypes maken en testen met echte gebruikers",
      "Van ontwerp naar werkende software",
    ],
  },
  {
    name: "Joaquin Schot",
    age: 21,
    role: "Onderzoek en klantcontact",
    photo: "/team/joaquin.jpg",
    study: "HBO Bachelor Communication & Multimedia Design",
    bio: "Joaquin zorgt dat Werkly aansluit op hoe installatiebedrijven werken. Zijn opleiding leert hem onderzoek doen naar gebruikers, hun route van eerste contact tot afronding in kaart brengen, en dat vertalen naar duidelijke keuzes en teksten in gewone taal. Daarom praat Werkly over een offerte en een factuur, niet over leads en pipelines.",
    skills: [
      "Gebruikersonderzoek en gesprekken met klanten",
      "Klantreizen in kaart brengen, van aanvraag tot factuur",
      "Heldere teksten in begrijpelijke taal",
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
            <h1 className="display max-w-2xl text-[clamp(2.75rem,7vw,5rem)]">
              Wij maken software die installateurs tijd teruggeeft.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted">
              Een aanvraag hoeft niet drie telefoontjes te kosten. Wij zijn twee studenten Communication &amp; Multimedia
              Design die vinden dat de klant één keer alles moet kunnen invullen, en dat de installateur de rest op één plek
              moet kunnen doen.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12" aria-label="Het team">
          <ul className="grid gap-10 md:grid-cols-2">
            {TEAM.map((p) => (
              <li key={p.name} className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
                <div className="relative aspect-[4/4.2] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={p.photo}
                    alt={`${p.name}, oprichter van Werkly`}
                    fill
                    sizes="(min-width: 768px) 560px, 100vw"
                    // Strakker uitgesneden zodat het gezicht groter in beeld staat.
                    className="origin-[50%_48%] scale-[1.55] object-cover object-[50%_48%]"
                    priority={p.name === TEAM[0].name}
                  />
                </div>
                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-semibold tracking-tight">{p.name}</h2>
                  <p className="mt-1 text-sm font-medium text-brand-strong">{p.role}</p>
                  <p className="mt-3 text-sm text-muted">
                    {p.age} jaar · {p.study}
                  </p>
                  <p className="mt-4">{p.bio}</p>
                  <h3 className="mt-6 text-sm font-semibold">Dit neemt {p.name.split(" ")[0]} mee uit zijn studie</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {p.skills.map((s) => (
                      <li key={s} className="flex gap-2">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m5 12 5 5 9-10" />
                        </svg>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white py-12">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="display-md text-4xl sm:text-5xl">Waarom wij dit maken</h2>
            <p className="mt-4 text-lg text-muted">
              Wij geloven dat het simpeler kan. Een vakman hoort zijn dag te besteden aan het werk waar hij goed in is, niet aan
              overtikken, nabellen en zoeken naar dat ene briefje met meerwerk. Dat is onze droom: dat het kantoorwerk vanzelf
              meeloopt met de klus.
            </p>
            <p className="mt-4 text-lg text-muted">
              Daarom bouwen we Werkly samen met installateurs. We gaan mee op pad, kijken hoe het nu gaat en schrappen alles wat
              niet nodig is. Wat overblijft is software die u zonder uitleg kunt gebruiken.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/#demo" className={btn.primary}>Plan een gesprek</Link>
              <a href={`mailto:${WERKLY.email}`} className={btn.secondary}>Mail ons</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
