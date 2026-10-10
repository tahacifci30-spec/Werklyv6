import { DEFAULT_TEAM } from "./agenda";
import { DEFAULT_RULES, mergeRules } from "./pricing/rules";
import { UNKNOWN, type Legal, type Product, type Settings, type TechCheck } from "./types";

/** Supabase wordt gebruikt zodra de server-sleutel is ingesteld; anders het JSON-bestand. */
export const USE_SUPABASE = !!(
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
);

/** Het (eerste) bedrijf waar het publieke klantformulier aanvragen aan koppelt. Zie supabase/migrations. */
export const DEFAULT_COMPANY = USE_SUPABASE
  ? (process.env.DEFAULT_COMPANY_ID ?? "00000000-0000-0000-0000-000000000001")
  : "demo-installatie";

export const defaultLegal = (): Legal => ({
  address: "",
  kvk: "",
  btw: "",
  iban: "",
  payment_days: 14,
});

/** Voorbeeldproducten; de eigenaar past ze aan bij Instellingen. Bedragen inclusief btw. */
export const DEFAULT_PRODUCTS: Product[] = [
  { label: "Bevestigingsmateriaal", amount: 45 },
  { label: "Muurbeugel buitenunit", amount: 95 },
  { label: "Extra leiding", amount: 35, unit: "per meter" },
  { label: "Condenspomp", amount: 145 },
  { label: "Kabelgoot", amount: 12, unit: "per meter" },
  { label: "Doorvoer harde wand", amount: 120 },
];

export const defaultSettings = (): Settings => ({
  company_name: "Demo Installatie",
  phone: "013 000 00 00",
  email: "info@demo-installatie.nl",
  pricing: DEFAULT_RULES,
  legal: defaultLegal(),
  invoice_seq: 0,
  team: DEFAULT_TEAM,
  products: DEFAULT_PRODUCTS,
  roster: [],
});

/** Vult opgeslagen instellingen aan met standaardwaarden (nieuwe velden, oudere data). */
export function mergeSettings(stored?: Partial<Settings> | null): Settings {
  const d = defaultSettings();
  if (!stored) return d;
  return {
    company_name: stored.company_name ?? d.company_name,
    phone: stored.phone ?? d.phone,
    email: stored.email ?? d.email,
    pricing: mergeRules(stored.pricing),
    legal: { ...d.legal, ...(stored.legal ?? {}) },
    invoice_seq: stored.invoice_seq ?? 0,
    team: stored.team?.length ? stored.team : d.team,
    demo_seeded: stored.demo_seeded,
    products: Array.isArray(stored.products) ? stored.products : d.products,
    notifications_seen_at: stored.notifications_seen_at,
    notifications_read: stored.notifications_read ?? [],
    roster: Array.isArray(stored.roster) ? stored.roster : [],
  };
}

export const emptyCheck = (): TechCheck => ({
  outdoor_unit: { value: UNKNOWN, source: "unknown" },
  pipe_distance: { value: UNKNOWN, source: "unknown" },
  meter_box: { value: UNKNOWN, source: "unknown" },
  wall_type: { value: UNKNOWN, source: "unknown" },
  mounting: { value: UNKNOWN, source: "unknown" },
  notes: "",
  photos: [],
});

export const newToken = () => crypto.randomUUID().replace(/-/g, "");

/** Volgend factuurnummer, bijvoorbeeld 2026-0007. */
export const formatInvoiceNumber = (year: number, seq: number) => `${year}-${String(seq).padStart(4, "0")}`;
