# Werkly

Van aanvraag tot factuur: klantformulier met richtlijnofferte, overzicht, agenda, monteur, offerte, factuur en omzet.

```bash
npm run dev
```

## Verloop

Nieuw > bezoek gepland > offerte controleren > offerte verstuurd > installatie plannen > installatie gepland >
factuur opstellen > wacht op betaling > afgerond (of afgewezen).

- De klant kiest in het formulier een voorkeursmoment. Past dat niet, dan stelt de eigenaar tot 3 vrije momenten voor
  (uit de agenda) en kiest de klant er één via een link.
- De monteur kan een afspraak afmelden ("Ik kan niet"). De eigenaar krijgt een melding bovenaan het overzicht.
- Na het bezoek staat de conceptofferte direct klaar. Na de installatie staat de conceptfactuur klaar, inclusief meerwerk.
- Omzet telt mee zodra een factuur als betaald is gemarkeerd.

## Pagina's

| Route | Wat |
|---|---|
| `/` | Website |
| `/intake` | Klantformulier (eigen vragen, prijsindicatie, één voorkeursdag) |
| `/login` | Inloggen (demo-accounts staan op de pagina, alleen in development) |
| `/dashboard`, `/dashboard/[id]` | Eigenaar: taken per soort werk, dossier met afspraken, offerte, factuur |
| `/dashboard/nieuw` | Zelf een aanvraag toevoegen (klant belt) |
| `/overons` | Over ons: het team |
| `/dashboard/agenda` | Agenda: klik op een dag om iets toe te voegen of te wijzigen; afmelden en ziekmelden |
| `/dashboard/rooster` | Rooster per week: aanvragen goedkeuren, met één klik in- of uitroosteren |
| `/dashboard/revenue` | Omzet per dag, week, maand en jaar |
| `/dashboard/revenue/openstaand` | Nog te ontvangen: onbetaalde facturen met herinnering |
| `/dashboard/settings` | Bedrijf, team met eigen login per monteur, producten, vragen en bedragen van het klantformulier |
| `/technician/agenda` | Monteur: eigen agenda |
| `/technician/rooster` | Monteur: rooster per week, vrij vragen en dagen opgeven |
| `/technician`, `/technician/[id]` | Monteur: afspraken, checklist bezoek, installatieverslag |
| `/offerte/[token]`, `/factuur/[token]` | Publieke links voor de klant |

## Structuur

- `lib/intake/questions.ts`: door het klantformulier lopen (de vragen zelf staan per bedrijf in `PricingRules.form`)
- `lib/pricing/`: prijsregels en berekening (geen AI)
- `lib/travel.ts`, `lib/geo.ts`, `lib/routes.ts`: geschatte reistijd bij het inplannen (PDOK, geen sleutel nodig)
- `lib/roster.ts`: rooster per week; `lib/calls.ts`: vrije momenten voor een gesprek via de website
- `lib/workflow.ts`: statussen en volgende actie
- `lib/agenda.ts`: afspraken en beschikbaarheid per monteur
- `lib/revenue.ts`, `lib/metrics.ts`: omzet en kerncijfers
- `lib/store.ts`: opslag; `store-file.ts` (JSON-bestand) of `store-supabase.ts` (zodra `SUPABASE_SERVICE_ROLE_KEY` is gezet)
- `lib/auth.ts`: sessie (ondertekende cookie); de eigenaar logt in met `DEMO_PASSWORD`, monteurs met een eigen e-mailadres en wachtwoord uit Instellingen
- `tests/`: tests voor prijs, formulier, agenda, rooster en reistijd; draai ze met `npm test`
- `app/actions.ts`: alle server actions
- `components/ActionForm.tsx`: formulier dat invoer behoudt bij een fout
- `scripts/build-brand.py`: maakt de logo's in `public/brand/` (`/brand/index.html` is de merkpresentatie)

## Supabase

Voer in de SQL Editor, in deze volgorde, uit: `0001_init.sql`, `0002_storage_and_demo.sql`, `0003_new_flow.sql`, `0004_agenda_and_more.sql`, `0005_agenda_description.sql`
(allemaal in `supabase/migrations/`). Zet daarna in `.env.local` of bij Netlify:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (geheim, geen `NEXT_PUBLIC_`)
- `AUTH_SECRET` (lange willekeurige tekst) en `DEMO_PASSWORD` (online verplicht, anders staat inloggen uit)

Voer `0003`, `0004` en `0005` uit **voordat** u deze versie publiceert, anders mist de database de nieuwe kolommen.
Nog niet in Supabase: inloggen (cookie met demo-gebruikers; tabel `profiles` en policies staan klaar voor Supabase Auth).

## Goed om te weten

- **Mailen is optioneel.** Zonder instelling deelt de eigenaar de link van offerte en factuur zelf via WhatsApp of e-mail. Zet `RESEND_API_KEY` en `MAIL_FROM` (een bij resend.com bevestigd afzenderadres) in de omgeving en Werkly mailt de klant vanzelf bij het goedkeuren. Zie `lib/mail.ts`.
- **Instellingen worden veilig opgeslagen.** `updateSettings` in `lib/store.ts` leest de laatste versie en schrijft alleen als niemand er intussen aan zat. Gebruik dit in plaats van `getSettings` gevolgd door `saveSettings` voor alles wat tegelijk kan gebeuren (factuurnummer, rooster, meldingen).
- **Limieten op inloggen en formulieren staan in het geheugen van de server.** Op Netlify begint dat geheugen steeds opnieuw; voor echte bescherming is een gedeelde opslag nodig.
- **Bedrijfsgegevens van Werkly zelf** staan in `lib/company.ts`. Wat leeg is, wordt niet op de site getoond.
- **Herinneringen.** Staat mailen aan, dan krijgt elke klant de dag voor zijn afspraak om 16:00 een herinnering. De geplande functie `netlify/functions/reminders.mjs` roept daarvoor `/api/cron/reminders` aan; de sleutel is afgeleid van `AUTH_SECRET`, dus er is geen extra instelling nodig. Zonder mail staat op het overzicht wie u via WhatsApp kunt herinneren.
- **Automatische mails.** Met mailen aan gaan vanzelf de deur uit: bevestiging na het inplannen, bericht bij verplaatsen of annuleren, herinnering de dag ervoor, de offerte en de factuur.
- **Betaallink.** Bij een openstaande factuur plakt de eigenaar een betaalverzoek van de bank of Tikkie; de klant ziet dan "Online betalen". Er is geen koppeling met een betaaldienst: de betaling vinkt u zelf af.
