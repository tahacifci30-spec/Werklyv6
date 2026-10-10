import { addDays, isDay, isWeekend, todayNl } from "@/lib/dates";
import { isComplete, isValidAnswer } from "@/lib/intake/questions";
import { DEFAULT_COMPANY, createLead, getSettings } from "@/lib/store";
import { onlyFiles, saveImages, validateImages } from "@/lib/uploads";
import type { DayChoice, Preferred } from "@/lib/types";

// Eenvoudige in-memory rate limit per IP. Vervang door een gedeelde store in productie.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

/** De voorkeur van de klant: een werkdag in de komende zes weken, in de ochtend of de middag. */
function parseChoice(v: unknown): DayChoice | null {
  const c = v as { date?: unknown; part?: unknown } | undefined;
  const today = todayNl();
  if (!c || !isDay(c.date) || (c.part !== "morning" && c.part !== "afternoon")) return null;
  if (c.date < today || c.date > addDays(today, 42) || isWeekend(c.date)) return null;
  return { date: c.date, part: c.part };
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (limited(ip)) {
    return Response.json(
      { error: "Te veel aanvragen. Probeer het over een paar minuten opnieuw." },
      { status: 429 },
    );
  }

  let form: FormData;
  let body: Record<string, unknown>;
  try {
    form = await request.formData();
    body = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  // Honeypot: echte gebruikers laten dit veld leeg.
  if (str(body.website, 100)) return Response.json({ ok: true });

  const { form: questions } = (await getSettings(DEFAULT_COMPANY)).pricing;
  const raw = (body.answers ?? {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const [q, v] of Object.entries(raw)) {
    if (typeof v !== "string" || !isValidAnswer(questions, q, v)) {
      return Response.json({ error: "Ongeldig antwoord in het formulier." }, { status: 400 });
    }
    answers[q] = v;
  }
  if (!isComplete(questions, answers)) {
    return Response.json({ error: "Het formulier is nog niet volledig." }, { status: 400 });
  }

  const c = (body.customer ?? {}) as Record<string, unknown>;
  const customer = {
    name: str(c.name, 120),
    email: str(c.email, 160),
    phone: str(c.phone, 30),
    postcode: str(c.postcode, 8).toUpperCase(),
    street: str(c.street, 120),
    city: str(c.city, 80),
    ...(c.business ? { company: str(c.company, 120) } : {}),
  };
  const errors: Record<string, string> = {};
  if (customer.name.length < 2) errors.name = "Vul uw naam in.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email))
    errors.email = "Vul een geldig e-mailadres in.";
  if (customer.phone.replace(/\D/g, "").length < 9)
    errors.phone = "Vul een geldig telefoonnummer in.";
  if (!/^[1-9]\d{3}\s?[A-Z]{2}$/.test(customer.postcode))
    errors.postcode = "Vul een postcode in zoals 5141 AB.";
  if (!/\d/.test(customer.street) || customer.street.length < 4)
    errors.street = "Vul straat en huisnummer in, zoals Kerkstraat 12.";
  if (customer.city.length < 2) errors.city = "Vul uw woonplaats in.";
  if (c.business && (customer.company ?? "").length < 2) errors.company = "Vul de naam van het bedrijf in.";
  if (body.consent !== true)
    errors.consent = "Geef toestemming om uw gegevens te gebruiken voor deze aanvraag.";

  let preferred: Preferred | undefined;
  if (body.preferred) {
    const first = parseChoice((body.preferred as { first?: unknown }).first);
    if (!first) errors.preferred = "Kies een werkdag in de komende weken, in de ochtend of de middag.";
    else preferred = { first };
  }

  const files = onlyFiles(form.getAll("photos"));
  const photoError = validateImages(files);
  if (photoError) errors.photos = photoError;

  if (Object.keys(errors).length) return Response.json({ errors }, { status: 422 });

  const photos = await saveImages(files);
  const lead = await createLead({ customer, answers, photos, preferred });
  return Response.json({ ok: true, id: lead.id });
}
