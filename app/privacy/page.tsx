import type { Metadata } from "next";
import { Logo } from "@/components/ui";
import { DEFAULT_COMPANY, getSettings } from "@/lib/store";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description: "Hoe Werkly en aangesloten installatiebedrijven omgaan met persoonsgegevens.",
};
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const s = await getSettings(DEFAULT_COMPANY);
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Logo />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Privacyverklaring</h1>

      <div className="mt-6 space-y-6 leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
        <section>
          <h2>Wie is verantwoordelijk?</h2>
          <p>
            Als u een aanvraag doet via het klantformulier, is <strong>{s.company_name}</strong> verantwoordelijk voor uw
            gegevens. Werkly verwerkt de gegevens uitsluitend in opdracht van {s.company_name} (verwerker). Contact:{" "}
            <a className="text-brand underline" href={`mailto:${s.email}`}>{s.email}</a>, {s.phone}.
          </p>
        </section>
        <section>
          <h2>Welke gegevens verwerken we?</h2>
          <ul>
            <li>Uw antwoorden in het formulier (bijvoorbeeld ruimte, oppervlakte en woningtype) en het moment dat u de monteur wilt ontvangen.</li>
            <li>Naam, e-mailadres, telefoonnummer en adres. Uw postcode en huisnummer worden opgezocht bij PDOK, de gratis adresdienst van de Nederlandse overheid, om de straat en woonplaats automatisch in te vullen.</li>
            <li>Foto’s die u zelf toevoegt.</li>
            <li>Gegevens die de monteur bij een bezoek vastlegt, en de offerte en factuur die daaruit volgen.</li>
          </ul>
        </section>
        <section>
          <h2>Waarvoor gebruiken we ze?</h2>
          <p>
            Om uw aanvraag te beoordelen, een prijsindicatie en offerte op te stellen, een bezoek en de installatie in te plannen en een factuur te sturen en contact met
            u op te nemen. De grondslag is uw toestemming bij het versturen van de aanvraag en, daarna, de uitvoering van
            de overeenkomst. De prijsindicatie wordt berekend met vaste prijsregels van het installatiebedrijf. Er worden geen
            besluiten uitsluitend door een geautomatiseerd proces genomen: een medewerker controleert elke offerte.
          </p>
        </section>
        <section>
          <h2>Hoe lang bewaren we ze?</h2>
          <p>Niet langer dan nodig voor deze doelen en voor wettelijke bewaartermijnen. Na afronding of afwijzing kunt u vragen uw gegevens te verwijderen.</p>
        </section>
        <section>
          <h2>Uw rechten</h2>
          <p>
            U kunt uw gegevens inzien, laten corrigeren of verwijderen, bezwaar maken, en uw toestemming intrekken. Stuur
            hiervoor een bericht naar {s.email}. Komt u er niet uit, dan kunt u een klacht indienen bij de Autoriteit
            Persoonsgegevens.
          </p>
        </section>
        <section>
          <h2>Cookies</h2>
          <p>
            We gebruiken alleen functionele opslag: een sessiecookie voor ingelogde medewerkers en tijdelijke
            browseropslag om uw formulier te hervatten. Er worden geen tracking- of advertentiecookies gebruikt.
          </p>
        </section>
      </div>
    </main>
  );
}
