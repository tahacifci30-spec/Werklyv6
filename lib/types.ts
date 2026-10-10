export const UNKNOWN = "unknown" as const;

/**
 * Verloop: nieuw > bezoek gepland > offerte controleren > offerte verstuurd
 * > installatie plannen > installatie gepland > factuur opstellen > wacht op betaling > afgerond.
 * Oudere statussen worden bij het lezen omgezet (zie normalizeStatus in workflow.ts).
 */
export type LeadStatus =
  | "new"
  | "visit_planned"
  | "visit_done"
  | "quote_review"
  | "quote_sent"
  | "install_to_plan"
  | "install_planned"
  | "install_done"
  | "invoice_sent"
  | "completed"
  | "rejected";

/** Herkomst van een gegeven: wie weet dit, en hoe zeker is het? */
export type Source = "customer" | "unknown" | "estimated" | "verified";

export type Customer = {
  name: string;
  email: string;
  phone: string;
  postcode: string;
  /** Straat en huisnummer */
  street: string;
  city: string;
  /** Bedrijfsnaam als de aanvraag zakelijk is; dan staan bedragen exclusief btw op offerte en factuur. */
  company?: string;
};

export type Estimate = {
  min: number;
  max: number;
  /** Menselijk leesbare redenen waarom de range breder is. */
  unknownFactors: string[];
  /** De waardes waarmee is gerekend, zoals ze toen heetten (blijft kloppen als het formulier later wijzigt). */
  lines?: EstimateLine[];
};

export type EstimateLine = { q: string; label: string; value: string; amount: number };

export type TechField = { value: string; source: Source };

export type TechCheck = {
  outdoor_unit: TechField;
  pipe_distance: TechField;
  meter_box: TechField;
  wall_type: TechField;
  mounting: TechField;
  notes: string;
  photos: string[];
  completed_at?: string;
};

export type QuoteItem = {
  id: string;
  label: string;
  amount: number;
  /** Alleen bij een regel met een aantal: aantal x prijs per eenheid = amount */
  qty?: number;
  price?: number;
  /** Bijvoorbeeld "per meter" of "per m³" */
  unit?: string;
};

export type Quote = {
  items: QuoteItem[];
  /** De waardes waarmee deze offerte is berekend (vraag-id -> antwoord-id). Begint als de antwoorden van de klant. */
  values?: Record<string, string>;
  generated_at: string;
  reviewed_at?: string;
  sent_at?: string;
  /** Beslissing van de klant via de offertelink */
  decided_at?: string;
  /** Eerdere verstuurde versies, bewaard als de offerte later is aangepast */
  history?: { items: QuoteItem[]; sent_at?: string; decided_at?: string; reopened_at: string }[];
};

export type Note = { at: string; by: string; text: string };

export type DayPart = "morning" | "afternoon" | "any";
export type DayChoice = { date: string; part: DayPart };

/** Wat de klant in het formulier als gewenst moment voor het bezoek koos. */
export type Preferred = { first: DayChoice; second?: DayChoice };

export type Appointment = {
  date: string;
  time: string;
  technician: string;
  /** Alleen bij een installatie: duur in dagen (0,5 / 1 / 2 / 3). */
  days?: number;
  /** Gezet wanneer de monteur aangeeft dat het niet kan. */
  declined_at?: string;
  /** Moment waarop de klant een herinnering voor deze afspraak kreeg. */
  reminded_at?: string;
};

export type InstallReport = {
  as_quoted: "yes" | "no";
  units: string;
  pipe_length: string;
  /** id van controlepunt -> afgevinkt */
  checks: Record<string, boolean>;
  serials: string;
  notes: string;
  photos: string[];
  /** Meerwerk dat op de factuur komt */
  extras: QuoteItem[];
  completed_at?: string;
};

export type Invoice = {
  /** Wordt toegekend bij het versturen. */
  number?: string;
  items: QuoteItem[];
  created_at: string;
  sent_at?: string;
  due_date?: string;
  paid_at?: string;
  /** Momenten waarop een betalingsherinnering is verstuurd. */
  reminders?: string[];
  /** Betaalverzoek van de bank of Tikkie; de klant ziet dan een knop "Online betalen" op de factuur. */
  pay_url?: string;
};

/**
 * Eigen onderdelen van de agenda naast bezoeken en installaties.
 * "item": een eigen afspraak (bijvoorbeeld 12:00 tot 15:00 een bespreking).
 * "off": een dag (of dagdeel) waarop iemand niet kan werken.
 */
export type AgendaItem = {
  id: string;
  company_id: string;
  kind: "item" | "off";
  title: string;
  date: string;
  /** Tot en met deze datum (alleen bij "off"). */
  date_to?: string;
  /** "HH:MM"; leeg = de hele dag */
  start?: string;
  end?: string;
  /** Naam van de monteur of "Eigenaar" */
  who: string;
  created_by: string;
  /** Extra uitleg bij een afspraak; mag leeg zijn. */
  description?: string;
};

export type LogEntry = { at: string; text: string };

export type Lead = {
  id: string;
  company_id: string;
  created_at: string;
  customer: Customer;
  /** key = vraag-id, value = optie-id of "unknown" */
  answers: Record<string, string>;
  estimate: Estimate;
  status: LeadStatus;
  preferred?: Preferred;
  /** Gewenst moment voor de installatie, door de klant gekozen bij het akkoord. */
  install_preferred?: DayChoice;
  appointment?: Appointment;
  install_appointment?: Appointment;
  check: TechCheck;
  quote?: Quote;
  install?: InstallReport;
  invoice?: Invoice;
  log: LogEntry[];
  /** Geheime sleutel voor de publieke links (offerte, factuur, afspraak) */
  token: string;
  consent_at: string;
  /** Foto's die de klant bij de aanvraag meestuurde */
  customer_photos: string[];
  notes: Note[];
};

export type Legal = {
  address: string;
  kvk: string;
  btw: string;
  iban: string;
  payment_days: number;
};

export type Settings = {
  company_name: string;
  phone: string;
  email: string;
  pricing: import("./pricing/rules").PricingRules;
  legal: Legal;
  /** Teller voor factuurnummers */
  invoice_seq: number;
  /** Wie er werkt en op welke dagen */
  team: TeamMember[];
  /** De voorbeeldklanten zijn eenmalig toegevoegd; daarna nooit meer vanzelf. */
  demo_seeded?: boolean;
  /** Vaste producten met prijs (incl. btw) die bij het typen in een offerteregel opduiken */
  products: Product[];
  /** Moment waarop de eigenaar de meldingen voor het laatst bekeek */
  notifications_seen_at?: string;
  /** Meldingen die de eigenaar los heeft geopend (na notifications_seen_at) */
  notifications_read?: string[];
  /** Roosteraanvragen van monteurs (vrij, verlof, beschikbare dagen) */
  roster: RosterRequest[];
};

/** `unit` is de eenheid waarin u rekent, bijvoorbeeld "per meter" of "per m³". Leeg = per stuk. */
export type Product = { label: string; amount: number; unit?: string };

/** Vast weekrooster van een monteur. `days`: 0 = maandag tot 6 = zondag. */
export type TeamMember = {
  name: string;
  days: number[];
  /** Losse dagen (YYYY-MM-DD) waarop iemand buiten de vaste dagen werkt, bijvoorbeeld bij een oproepcontract. */
  extra?: string[];
  /** Mobiel nummer, zodat de eigenaar de monteur met één tik belt. */
  phone?: string;
  /** Eigen login van de monteur: e-mailadres en de afgeleide sleutel van zijn wachtwoord (nooit het wachtwoord zelf). */
  email?: string;
  pass?: string;
};

/**
 * Aanvraag van een monteur voor het rooster: vrij vragen ("off") of dagen opgeven waarop hij kan werken ("work").
 * De eigenaar keurt goed of wijst af. Pas na goedkeuring telt het mee in de agenda.
 */
export type RosterRequest = {
  id: string;
  who: string;
  kind: "off" | "work";
  /** De dagen waar het om gaat (YYYY-MM-DD), oplopend */
  dates: string[];
  /** Bij "off": Vrij, Verlof, Ziek of Anders */
  reason?: string;
  note?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  decided_at?: string;
  /** Agenda-items die bij goedkeuring zijn gemaakt (om het terug te kunnen draaien) */
  item_ids?: string[];
};

export type Role = "owner" | "technician";
export type Session = { name: string; role: Role; company_id: string };
