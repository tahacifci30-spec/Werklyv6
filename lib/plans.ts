/**
 * Pakketten van Werkly zoals ze op de website staan. Bedragen zijn excl. btw.
 * Alleen wat nu werkt staat bij "includes"; wat nog komt staat bij "soon".
 */
export type Plan = {
  id: "start" | "team" | "bedrijf";
  name: string;
  audience: string;
  /** null = op aanvraag */
  monthly: string | null;
  setup: string | null;
  /** Prijs is een vanaf-prijs: het bedrag hangt af van wat er nodig is */
  from?: boolean;
  highlight?: boolean;
  /** Korte kop boven de lijst, bijvoorbeeld "Alles uit Start, plus:" */
  lead: string;
  includes: string[];
  /** Waarom dit pakket aantrekkelijk is voor de eigenaar */
  why: string[];
  setupIncludes: string;
  soon: string[];
};

export const PLANS: Plan[] = [
  {
    id: "start",
    name: "Start",
    audience: "Voor de zelfstandige installateur",
    monthly: "€150",
    setup: "€999",
    lead: "Dit zit erin:",
    includes: [
      "1 gebruiker (de eigenaar)",
      "Klantformulier met prijsindicatie op uw eigen prijzen",
      "Vaste producten met prijs die bij het typen in de offerte opduiken",
      "Overzicht van alle aanvragen, met steeds de volgende stap",
      "U krijgt een melding bij elke aanvraag, belt de klant en plant direct in",
      "Agenda met vrije tijden en een schatting van de reistijd tussen klanten",
      "Offerte met online akkoord, factuur als PDF en betalingsherinneringen",
      "Privacyverklaring en toestemming per aanvraag",
    ],
    why: [
      "Geen telefoontjes meer om gegevens na te vragen: de klant vult alles zelf in",
      "U weet na één blik wat u vandaag moet doen",
    ],
    setupIncludes: "Wij richten uw prijsregels, bedrijfsgegevens en klantformulier voor u in.",
    soon: ["Automatische e-mail naar klanten", "Koppeling met SnelStart en andere boekhoudprogramma’s"],
  },
  {
    id: "team",
    name: "Team",
    audience: "Voor bedrijven met monteurs",
    monthly: "€250",
    setup: "€1.999",
    highlight: true,
    lead: "Alles uit Start, plus:",
    includes: [
      "Tot 5 gebruikers: eigenaar, planner en monteurs",
      "Monteur-omgeving op de telefoon: checklist, foto's, serienummers en meerwerk",
      "Rooster per week: monteurs vragen zelf vrij aan en geven door wanneer ze kunnen werken",
      "Omzet per dag, week, maand en jaar",
      "Export van al uw aanvragen naar Excel",
    ],
    why: [
      "Geen telefoontjes meer tussen kantoor en monteur: alles staat in het dossier",
      "Meerwerk komt direct op de factuur, dus niets wordt vergeten",
      "U ziet elke maand wat het oplevert, en wat nog openstaat",
    ],
    setupIncludes: "Training voor uw team en het overzetten van lopende aanvragen.",
    soon: ["Eigen logo en kleuren", "Koppeling met Google Agenda", "Koppeling met SnelStart en andere boekhoudprogramma’s"],
  },
  {
    id: "bedrijf",
    name: "Bedrijf",
    audience: "Voor groeiende bedrijven",
    monthly: "€395",
    setup: "€2.999",
    from: true,
    lead: "Alles uit Team, plus:",
    includes: [
      "Onbeperkt aantal gebruikers",
      "Een vaste contactpersoon die uw proces kent",
      "Voorrang bij vragen en aanpassingen",
    ],
    why: [
      "Groeit mee: meerdere teams en diensten in één omgeving",
      "Afspraken op maat, zodat Werkly past bij hoe u werkt",
    ],
    setupIncludes: "Samen bepalen we wat u nodig heeft, inclusief eigen huisstijl.",
    soon: [],
  },
];

/** Dingen die we samen bespreken bij Bedrijf (nog geen vaste functies). */
export const BEDRIJF_CUSTOM = [
  "Meerdere formulieren, bijvoorbeeld per dienst of vestiging",
  "Eigen domein en huisstijl",
  "Koppelingen met uw boekhouding",
];
